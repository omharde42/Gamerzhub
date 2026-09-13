import prisma from '../config/database';

export const WELCOME_POST_ID = 'gamerhub-official-welcome-post';

export const WELCOME_POST_DATA = {
  id: WELCOME_POST_ID,
  content: `🎮 Welcome to GamerHub!

GamerHub is your social platform built for gamers.

Here you can:
🎮 Discover and connect with gamers
🤝 Build your gaming network
👥 Find teammates and teams
🏆 Discover tournaments
💬 Chat with other gamers
🎯 Find gaming opportunities
📊 Showcase your gaming profile and achievements
🤖 Use AI-powered gaming features

Build your gamer identity. Find your squad. Compete. Connect. Grow.

Welcome to GamerHub! 🚀`,
  hashtags: ['GamerHub', 'Welcome', 'GamingCommunity'],
  isPublished: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  user: {
    id: 'gamerhub-official-system',
    profile: {
      username: 'GamerHub',
      displayName: 'GamerHub Official',
      avatar: 'https://files.idyllic.app/files/static/2039559?width=1920&optimizer=image',
      verified: true,
      badge: '✓ Official GamerHub',
    },
  },
  _count: {
    likes: 1337,
    comments: 42,
  },
};

let isWelcomePostInitialized = false;
let welcomePostInitializationPromise: Promise<void> | null = null;

export class FeedService {
  async ensureOfficialWelcomePostExists(): Promise<void> {
    if (isWelcomePostInitialized) return;
    if (welcomePostInitializationPromise) {
      return welcomePostInitializationPromise;
    }

    welcomePostInitializationPromise = Promise.resolve().then(async () => {
      // Find or create official system user in database
      const systemUser = await prisma.user.upsert({
        where: { email: 'official@gamerhub.com' },
        update: {},
        create: {
          id: 'gamerhub-official-system',
          email: 'official@gamerhub.com',
          password: 'system-official-protected-account',
          profile: {
            create: {
              username: 'GamerHub',
              displayName: 'GamerHub Official',
              avatar: 'https://files.idyllic.app/files/static/2039559?width=1920&optimizer=image',
              verified: true,
              bio: 'Official GamerHub Platform Announcement',
            },
          },
        },
      });

      // Find or create official welcome post in database
      await prisma.post.upsert({
        where: { id: WELCOME_POST_ID },
        update: {},
        create: {
          id: WELCOME_POST_ID,
          content: WELCOME_POST_DATA.content,
          type: 'POST',
          isPublished: true,
          userId: systemUser.id,
          createdAt: WELCOME_POST_DATA.createdAt,
        },
      });

      isWelcomePostInitialized = true;
    }).catch((err) => {
      console.warn('Official welcome post database initialization warning:', err);
    }).finally(() => {
      welcomePostInitializationPromise = null;
    });

    return welcomePostInitializationPromise;
  }

  async getFeed(userId?: string, page: number = 1, limit: number = 20) {
    // Non-blocking background check for welcome post initialization
    if (!isWelcomePostInitialized) {
      this.ensureOfficialWelcomePostExists().catch(() => {});
    }

    const whereClause: any = { isPublished: true };
    if (userId) {
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = Array.from(new Set([userId, 'gamerhub-official-system', ...following.map((f) => f.followingId)]));
      whereClause.userId = { in: followingIds };
    }

    // Fetch 1 extra post to efficiently calculate hasNext without extra DB count query on pagination
    const posts = await prisma.post.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit + 1,
      include: {
        user: { select: { id: true, profile: true } },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId }, take: 1 } : false,
        poll: { include: { options: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const hasNext = posts.length > limit;
    const pagePosts = hasNext ? posts.slice(0, limit) : posts;
    const total = page === 1 && !hasNext ? pagePosts.length : (page * limit + (hasNext ? 1 : 0));

    const formattedPosts = pagePosts.map((post) => ({
      ...post,
      isLiked: Array.isArray(post.likes) && post.likes.length > 0,
      likes: undefined,
      isOfficialWelcome: post.id === WELCOME_POST_ID,
    }));

    return {
      data: formattedPosts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext,
        hasPrev: page > 1,
      },
    };
  }

  async follow(followerId: string, followingId: string) {
    return prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
  }

  async unfollow(followerId: string, followingId: string) {
    await prisma.follow.deleteMany({ where: { followerId, followingId } });
  }

  async getFollowing(userId: string) {
    return prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { select: { id: true, profile: true } } },
    });
  }

  async getFollowers(userId: string) {
    return prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { select: { id: true, profile: true } } },
    });
  }
}

export const feedService = new FeedService();
