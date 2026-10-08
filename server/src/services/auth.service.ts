import prisma from '../config/database';
import { hashPassword, comparePassword, generateToken, generateRefreshToken, sanitizeUser } from '../utils/helpers';
import { ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '../utils/errors';
import { sendEmail } from './email.service';
import { verifySupabaseJwt } from '../utils/supabaseAuth';
import { redis } from '../config/redis';
import { config } from '../config';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { generateUniqueGamerZId } from '../utils/gamerzId';

export class AuthService {
  async register(email: string, password: string, username?: string) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) throw new ConflictError('Email already registered');
    
    let finalUsername = username ? username.trim() : '';
    if (!finalUsername) {
      const prefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      finalUsername = `${prefix}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const existingUsername = await prisma.profile.findUnique({ where: { username: finalUsername } });
    if (existingUsername) throw new ConflictError('Username already taken');

    const gamerzId = await generateUniqueGamerZId();
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        gamerzId,
        password: hashedPassword,
        emailVerified: new Date(),
        profile: { create: { username: finalUsername } },
        notificationSettings: { create: {} },
      },
      include: { profile: true },
    });
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await prisma.session.create({ data: { refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } });
    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      gamerzId,
      message: `Your GamerZ ID is ${gamerzId}. This is your unique GamerZ Hub identity.`,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true, subscription: true },
    });
    if (!user) throw new UnauthorizedError('Invalid credentials');
    if (!user.password) throw new UnauthorizedError('Account uses OAuth. Please sign in with Google, Discord, or Steam.');
    const isValid = await comparePassword(password, user.password);
    if (!isValid) throw new UnauthorizedError('Invalid credentials');
    if (user.banned) throw new UnauthorizedError(`Account banned: ${user.banReason || 'No reason provided'}`);
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);
    await prisma.session.create({ data: { refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } });
    return { user: sanitizeUser(user), accessToken, refreshToken, requiresTwoFactor: user.isTwoFactorEnabled };
  }

  async refreshToken(token: string) {
    const session = await prisma.session.findUnique({ where: { refreshToken: token }, include: { user: true } });
    if (!session || session.expiresAt < new Date()) { if (session) await prisma.session.delete({ where: { id: session.id } }); throw new UnauthorizedError('Invalid or expired refresh token'); }
    const payload = { userId: session.user.id, email: session.user.email, role: session.user.role };
    const accessToken = generateToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    await prisma.session.update({ where: { id: session.id }, data: { refreshToken: newRefreshToken, expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } });
    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) { await prisma.session.deleteMany({ where: { refreshToken } }); }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({ data: { token: resetToken, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    await sendEmail({ to: email, subject: 'Reset your GamerHub password', html: `<p>Click <a href="${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}">here</a> to reset your password. This link expires in 1 hour.</p>` });
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expiresAt < new Date()) throw new ValidationError({ token: ['Invalid or expired reset token'] });
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: resetToken.userId }, data: { password: hashedPassword } });
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
    await prisma.session.deleteMany({ where: { userId: resetToken.userId } });
  }

  async verifyEmail(token: string) {
    const verificationToken = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!verificationToken || verificationToken.expiresAt < new Date()) throw new ValidationError({ token: ['Invalid or expired verification token'] });
    await prisma.user.update({ where: { id: verificationToken.userId }, data: { emailVerified: new Date() } });
    await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
  }

  async setupTwoFactor(userId: string) {
    const secret = speakeasy.generateSecret({ name: 'GamerHub' });
    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret.base32 } });
    return { secret: secret.base32, otpauthUrl: secret.otpauth_url };
  }

  async verifyTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new ValidationError({ token: ['2FA not set up'] });
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token });
    if (!verified) throw new ValidationError({ token: ['Invalid 2FA token'] });
    await prisma.user.update({ where: { id: userId }, data: { isTwoFactorEnabled: true } });
    return { verified: true };
  }

  async setPassword(userId: string, password: string) {
    if (!password || password.length < 6) throw new ValidationError({ password: ['Password must be at least 6 characters'] });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (user.password) throw new ValidationError({ password: ['User already has a password. Use change password instead.'] });
    const hashedPassword = await hashPassword(password);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) throw new ValidationError({ password: ['New password must be at least 6 characters'] });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');
    if (!user.password) throw new ValidationError({ password: ['No password set. Use set password instead.'] });
    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
    await prisma.session.deleteMany({ where: { userId } });
  }

  async disableTwoFactor(userId: string, token: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) throw new ValidationError({ token: ['2FA not set up'] });
    const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token });
    if (!verified) throw new ValidationError({ token: ['Invalid 2FA token'] });
    await prisma.user.update({ where: { id: userId }, data: { isTwoFactorEnabled: false, twoFactorSecret: null } });
  }

  async socialLogin(supabaseToken: string, providerName: string) {
    if (!supabaseToken) {
      throw new ValidationError({ token: ['Supabase token is required'] });
    }

    // Fail closed: the token must carry a valid signature from Supabase.
    // No fallback to jwt.decode() — an unsigned/forged token must never be accepted.
    const decoded = verifySupabaseJwt(supabaseToken);

    const { email, sub: providerId, user_metadata } = decoded;

    if (!email || !providerId) {
      throw new ValidationError({ email: ['Supabase token payload does not contain an email'] });
    }

    // Map provider name to our AccountProvider enum
    let provider: 'GOOGLE' | 'DISCORD' | 'STEAM' | 'APPLE' = 'GOOGLE';
    const normProvider = providerName.toUpperCase();
    if (normProvider.includes('GOOGLE')) provider = 'GOOGLE';
    else if (normProvider.includes('DISCORD')) provider = 'DISCORD';
    else if (normProvider.includes('STEAM')) provider = 'STEAM';
    else if (normProvider.includes('APPLE')) provider = 'APPLE';
    else provider = 'GOOGLE'; // default fallback

    // 1. Check if Account mapping already exists
    const account = await prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            subscription: true,
          },
        },
      },
    });

    let user: any;

    if (account) {
      user = account.user;
    } else {
      // 2. Check if a User with the same email already exists
      user = await prisma.user.findUnique({
        where: { email },
        include: {
          profile: true,
          subscription: true,
        },
      });

      const metaName = typeof user_metadata?.full_name === 'string' ? user_metadata.full_name : typeof user_metadata?.name === 'string' ? user_metadata.name : null;
      const avatarUrl = typeof user_metadata?.avatar_url === 'string' ? user_metadata.avatar_url : typeof user_metadata?.picture === 'string' ? user_metadata.picture : null;

      if (user) {
        // Link the existing user to the new social account
        await prisma.account.create({
          data: {
            provider,
            providerId,
            providerUsername: metaName,
            userId: user.id,
          },
        });
      } else {
        // 3. Create a brand new user
        // Generate a clean, unique username from email
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        let username = `${emailPrefix}${randomNum}`;

        // Ensure username uniqueness
        let existingUser = await prisma.profile.findUnique({ where: { username } });
        while (existingUser) {
          username = `${emailPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
          existingUser = await prisma.profile.findUnique({ where: { username } });
        }

        user = await prisma.user.create({
          data: {
            email,
            gamerzId: await generateUniqueGamerZId(),
            emailVerified: new Date(),
            profile: {
              create: {
                username,
                displayName: metaName || username,
                avatar: avatarUrl,
              },
            },
            notificationSettings: {
              create: {},
            },
            accounts: {
              create: {
                provider,
                providerId,
                providerUsername: metaName,
              },
            },
          },
          include: {
            profile: true,
            subscription: true,
          },
        });
      }
    }

    if (user.banned) {
      throw new UnauthorizedError(`Account banned: ${user.banReason || 'No reason provided'}`);
    }

    // 4. Generate our standard app access/refresh tokens
    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      requiresTwoFactor: false,
    };
  }

  async directGoogleLogin(
    params:
      | {
          email?: string;
          displayName?: string;
          avatarUrl?: string;
          googleId?: string;
          token?: string;
          idToken?: string;
        }
      | string,
    displayNameArg?: string,
    avatarUrlArg?: string,
    googleIdArg?: string
  ) {
    let email = typeof params === 'string' ? params : params.email;
    let displayName = typeof params === 'string' ? displayNameArg : params.displayName;
    let avatarUrl = typeof params === 'string' ? avatarUrlArg : params.avatarUrl;
    let googleId = typeof params === 'string' ? googleIdArg : params.googleId;
    const token = typeof params === 'object' ? params.token : undefined;
    const idToken = typeof params === 'object' ? params.idToken : undefined;

    // Server-side verification of Google Token if email is missing or token is provided
    if ((!email || !googleId) && (token || idToken)) {
      try {
        if (token) {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (userinfoRes.ok) {
            const userinfo = (await userinfoRes.json()) as any;
            if (userinfo.email) {
              email = userinfo.email;
              googleId = userinfo.sub || googleId;
              displayName = userinfo.name || displayName || email!.split('@')[0];
              avatarUrl = userinfo.picture || avatarUrl || null;
            }
          }
        }
        if (!email && idToken) {
          const tokeninfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
          if (tokeninfoRes.ok) {
            const tokeninfo = (await tokeninfoRes.json()) as any;
            if (tokeninfo.email) {
              email = tokeninfo.email;
              googleId = tokeninfo.sub || googleId;
              displayName = tokeninfo.name || displayName || email!.split('@')[0];
              avatarUrl = tokeninfo.picture || avatarUrl || null;
            }
          }
        }
      } catch (err) {
        console.error('[Server Google Token Verification Error]:', err);
      }
    }

    if (!email) throw new ValidationError({ email: ['Google authentication failed: Email is required'] });

    const account = await prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: 'GOOGLE',
          providerId: googleId || email,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            subscription: true,
          },
        },
      },
    });

    let user: any;

    if (account) {
      user = account.user;
    } else {
      user = await prisma.user.findUnique({
        where: { email },
        include: { profile: true, subscription: true },
      });

      if (user) {
        await prisma.account.create({
          data: {
            provider: 'GOOGLE',
            providerId: googleId || email,
            providerUsername: displayName || null,
            userId: user.id,
          },
        });
      } else {
        const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        let username = `${emailPrefix}${randomNum}`;

        let existingUser = await prisma.profile.findUnique({ where: { username } });
        while (existingUser) {
          username = `${emailPrefix}${Math.floor(1000 + Math.random() * 9000)}`;
          existingUser = await prisma.profile.findUnique({ where: { username } });
        }

        user = await prisma.user.create({
          data: {
            email,
            gamerzId: await generateUniqueGamerZId(),
            emailVerified: new Date(),
            profile: {
              create: {
                username,
                displayName: displayName || username,
                avatar: avatarUrl || null,
              },
            },
            notificationSettings: {
              create: {},
            },
            accounts: {
              create: {
                provider: 'GOOGLE',
                providerId: googleId || email,
                providerUsername: displayName || null,
              },
            },
          },
          include: {
            profile: true,
            subscription: true,
          },
        });
      }
    }

    if (user.banned) {
      throw new UnauthorizedError(`Account banned: ${user.banReason || 'No reason provided'}`);
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      requiresTwoFactor: false,
    };
  }

  async steamLogin(steamId: string, personaName: string, avatarUrl: string) {
    if (!steamId) throw new ValidationError({ steamId: ['Steam ID is required'] });

    type UserWithRelations = NonNullable<Awaited<ReturnType<typeof prisma.user.findUnique<{ where: { id: string }; include: { profile: true; subscription: true } }>>>>;

    const account = await prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: 'STEAM',
          providerId: steamId,
        },
      },
      include: {
        user: {
          include: {
            profile: true,
            subscription: true,
          },
        },
      },
    });

    let user: UserWithRelations;

    if (account) {
      user = await prisma.user.update({
        where: { id: account.userId },
        data: {
          steamId,
          steamUsername: personaName || undefined,
          steamAvatar: avatarUrl || undefined,
          steamProfileUrl: `https://steamcommunity.com/profiles/${steamId}`,
          steamConnectedAt: new Date(),
        },
        include: { profile: true, subscription: true },
      });
    } else {
      const cleanName = (personaName || 'Gamer').replace(/[^a-zA-Z0-9]/g, '') || 'SteamGamer';
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      let username = `${cleanName}${randomNum}`;

      let existingUser = await prisma.profile.findUnique({ where: { username } });
      while (existingUser) {
        username = `${cleanName}${Math.floor(1000 + Math.random() * 9000)}`;
        existingUser = await prisma.profile.findUnique({ where: { username } });
      }

      const email = `steam_${steamId}@gamerhub.app`;

      user = await prisma.user.create({
        data: {
          email,
          gamerzId: await generateUniqueGamerZId(),
          emailVerified: new Date(),
          steamId,
          steamUsername: personaName || username,
          steamAvatar: avatarUrl || null,
          steamProfileUrl: `https://steamcommunity.com/profiles/${steamId}`,
          steamLevel: 32,
          steamConnectedAt: new Date(),
          profile: {
            create: {
              username,
              displayName: personaName || username,
              avatar: avatarUrl || null,
            },
          },
          notificationSettings: {
            create: {},
          },
          accounts: {
            create: {
              provider: 'STEAM',
              providerId: steamId,
              providerUsername: personaName || null,
            },
          },
        },
        include: {
          profile: true,
          subscription: true,
        },
      });
    }

    if (user.banned) {
      throw new UnauthorizedError(`Account banned: ${user.banReason || 'No reason provided'}`);
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      requiresTwoFactor: false,
    };
  }

  async getLinkedAccounts(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        discordId: true,
        discordUsername: true,
        discordDisplayName: true,
        discordAvatar: true,
        discordConnectedAt: true,
        steamId: true,
        steamUsername: true,
        steamAvatar: true,
        steamProfileUrl: true,
        steamLevel: true,
        steamConnectedAt: true,
      },
    });

    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        providerId: true,
        providerUsername: true,
      },
    });

    return {
      accounts,
      discord: user?.discordId ? {
        connected: true,
        id: user.discordId,
        username: user.discordUsername,
        displayName: user.discordDisplayName,
        avatar: user.discordAvatar,
        connectedAt: user.discordConnectedAt,
      } : {
        connected: false,
      },
      steam: user?.steamId ? {
        connected: true,
        steamId: user.steamId,
        username: user.steamUsername,
        avatar: user.steamAvatar,
        profileUrl: user.steamProfileUrl,
        level: user.steamLevel || 32,
        connectedAt: user.steamConnectedAt,
      } : {
        connected: false,
      },
    };
  }

  async unlinkSteamAccount(userId: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        steamId: null,
        steamUsername: null,
        steamAvatar: null,
        steamProfileUrl: null,
        steamLevel: null,
        steamConnectedAt: null,
      },
    });

    await prisma.account.deleteMany({
      where: {
        userId,
        provider: 'STEAM',
      },
    });
    return { success: true };
  }

  async linkDiscordAccount(userId: string, profile: {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    const existing = await prisma.user.findFirst({
      where: {
        discordId: profile.id,
        NOT: { id: userId },
      },
    });

    if (existing) {
      throw new ValidationError({ discord: ['This Discord account is already linked to another GamerZ Hub user.'] });
    }

    const avatarUrl = profile.avatar
      ? (profile.avatar.startsWith('http') ? profile.avatar : `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`)
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id || '0') % 5}.png`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: profile.id,
        discordUsername: profile.username,
        discordDisplayName: profile.globalName || profile.username,
        discordAvatar: avatarUrl,
        discordEmail: profile.email || null,
        discordAccessToken: profile.accessToken || null,
        discordRefreshToken: profile.refreshToken || null,
        discordConnectedAt: new Date(),
      },
      include: {
        profile: true,
      },
    });

    await prisma.account.upsert({
      where: { provider_providerId: { provider: 'DISCORD', providerId: profile.id } },
      create: {
        userId,
        provider: 'DISCORD',
        providerId: profile.id,
        providerUsername: profile.username,
      },
      update: {
        userId,
        providerUsername: profile.username,
      },
    });

    return updatedUser;
  }

  async unlinkDiscordAccount(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User');

    await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: null,
        discordUsername: null,
        discordDisplayName: null,
        discordAvatar: null,
        discordEmail: null,
        discordAccessToken: null,
        discordRefreshToken: null,
        discordConnectedAt: null,
      },
    });

    await prisma.account.deleteMany({
      where: {
        userId,
        provider: 'DISCORD',
      },
    });
    return { success: true };
  }

  async discordLogin(profile: {
    id: string;
    username: string;
    globalName?: string;
    avatar?: string;
    email?: string;
    accessToken?: string;
    refreshToken?: string;
  }) {
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { discordId: profile.id },
          ...(profile.email ? [{ email: profile.email.toLowerCase() }] : []),
        ],
      },
      include: {
        profile: true,
        subscription: true,
      },
    });

    const avatarUrl = profile.avatar
      ? (profile.avatar.startsWith('http') ? profile.avatar : `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`)
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(profile.id || '0') % 5}.png`;

    if (!user) {
      const email = profile.email
        ? profile.email.toLowerCase()
        : `discord_${profile.id}@gamerhub.local`;
      
      const baseUsername = profile.username.replace(/[^a-zA-Z0-9_]/g, '') || `Gamer_${profile.id.slice(-4)}`;
      let username = baseUsername;
      let count = 1;

      while (await prisma.profile.findUnique({ where: { username } })) {
        username = `${baseUsername}_${count++}`;
      }

      user = await prisma.user.create({
        data: {
          email,
          gamerzId: await generateUniqueGamerZId(),
          discordId: profile.id,
          discordUsername: profile.username,
          discordDisplayName: profile.globalName || profile.username,
          discordAvatar: avatarUrl,
          discordEmail: profile.email || null,
          discordAccessToken: profile.accessToken || null,
          discordRefreshToken: profile.refreshToken || null,
          discordConnectedAt: new Date(),
          profile: {
            create: {
              username,
              displayName: profile.globalName || profile.username,
              avatar: avatarUrl,
            },
          },
          accounts: {
            create: {
              provider: 'DISCORD',
              providerId: profile.id,
              providerUsername: profile.username,
            },
          },
        },
        include: {
          profile: true,
          subscription: true,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          discordId: profile.id,
          discordUsername: profile.username,
          discordDisplayName: profile.globalName || profile.username,
          discordAvatar: avatarUrl,
          discordEmail: profile.email || user.discordEmail,
          discordAccessToken: profile.accessToken || user.discordAccessToken,
          discordRefreshToken: profile.refreshToken || user.discordRefreshToken,
          discordConnectedAt: user.discordConnectedAt || new Date(),
        },
        include: {
          profile: true,
          subscription: true,
        },
      });

      await prisma.account.upsert({
        where: { provider_providerId: { provider: 'DISCORD', providerId: profile.id } },
        create: {
          userId: user.id,
          provider: 'DISCORD',
          providerId: profile.id,
          providerUsername: profile.username,
        },
        update: {
          providerUsername: profile.username,
        },
      });
    }

    if (user.banned) {
      throw new UnauthorizedError(`Account banned: ${user.banReason || 'No reason provided'}`);
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await prisma.session.create({
      data: {
        refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
      requiresTwoFactor: false,
    };
  }

  async linkSocialAccount(userId: string, provider: 'GOOGLE' | 'DISCORD' | 'STEAM', providerId: string, providerUsername?: string) {
    const existing = await prisma.account.findUnique({
      where: {
        provider_providerId: { provider, providerId },
      },
    });

    if (existing) {
      if (existing.userId === userId) return existing;
      throw new ValidationError({ provider: [`This ${provider} account is already linked to another GamerHub user.`] });
    }

    return prisma.account.create({
      data: {
        userId,
        provider,
        providerId,
        providerUsername: providerUsername || null,
      },
    });
  }

  async unlinkSocialAccount(userId: string, provider: 'GOOGLE' | 'DISCORD' | 'STEAM') {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { accounts: true } });
    if (!user) throw new NotFoundError('User');

    if (!user.password && user.accounts.length <= 1) {
      throw new ValidationError({ provider: ['Cannot unlink your only authentication method. Please set a password first.'] });
    }

    await prisma.account.deleteMany({
      where: {
        userId,
        provider,
      },
    });
    return { success: true };
  }

  /**
   * Best-effort removal of the matching Supabase auth identity (used for
   * social sign-in). Uses the GoTrue admin API with the service role key so
   * the user cannot sign in again via Supabase after their account is gone.
   * Silently skipped when Supabase is not configured.
   */
  private async deleteSupabaseAuthUser(email: string) {
    const { url, serviceRoleKey } = config.supabase;
    if (!url || !serviceRoleKey) return;

    try {
      const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
      const listRes = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
      if (!listRes.ok) return;
      const { users = [] } = await listRes.json();
      const match = users.find((u: any) => u?.email && u.email.toLowerCase() === email.toLowerCase());
      if (match?.id) {
        await fetch(`${url}/auth/v1/admin/users/${match.id}`, { method: 'DELETE', headers });
      }
    } catch (err) {
      console.warn('Could not delete Supabase auth user:', err);
    }
  }

  /**
   * Permanently deletes the account and all associated data.
   *
   * Most relations cascade from User in the schema, but a handful do not
   * (friend requests, endorsements given, server membership/messages,
   * reactions, audit logs, challenge teams the user captains, and owned
   * organizations/servers) — those are cleaned up explicitly first.
   */
  async deleteAccount(userId: string, password?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { accounts: true } });
    if (!user) throw new NotFoundError('User');

    // Password users must confirm their password before deletion.
    if (user.password) {
      if (!password) {
        throw new ValidationError({ password: ['Password is required to delete your account'] });
      }
      const isValid = await comparePassword(password, user.password);
      if (!isValid) throw new UnauthorizedError('Password is incorrect');
    }

    // Non-cascading relations
    await prisma.friendRequest.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
    await prisma.endorsement.deleteMany({ where: { endorserId: userId } });
    await prisma.auditLog.deleteMany({ where: { userId } });
    await prisma.serverMember.deleteMany({ where: { userId } });
    await prisma.serverMessage.deleteMany({ where: { senderId: userId } });
    await prisma.messageReaction.deleteMany({ where: { userId } });
    await prisma.challengeTeam.deleteMany({ where: { captainId: userId } });
    // Owned organizations/servers are removed with their cascading content
    // (tournaments, jobs, channels, messages, etc.).
    await prisma.organization.deleteMany({ where: { ownerId: userId } });
    await prisma.server.deleteMany({ where: { ownerId: userId } });

    await this.deleteSupabaseAuthUser(user.email);

    // Everything else (profile, posts, sessions, accounts, match history, ...)
    // is removed by the schema-level ON DELETE CASCADE.
    await prisma.user.delete({ where: { id: userId } });
    return { success: true };
  }
}
export const authService = new AuthService();
