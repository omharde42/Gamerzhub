'use client';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Lock } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface TournamentWorkspaceChatProps {
  tournamentId: string;
  isApprovedParticipant: boolean;
  isOrganizer: boolean;
  userStatus?: string;
}

export function TournamentWorkspaceChat({
  tournamentId,
  isApprovedParticipant,
  isOrganizer,
  userStatus,
}: TournamentWorkspaceChatProps) {
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const canAccessChat = isOrganizer || isApprovedParticipant;

  const { data: chatData, isLoading } = useQuery({
    queryKey: ['tournament-chat', tournamentId],
    queryFn: async () => {
      const res = await api.get(`/tournaments/${tournamentId}/chat`);
      return res.data.data;
    },
    enabled: canAccessChat,
    refetchInterval: 5000,
  });

  const sendMut = useMutation({
    mutationFn: (text: string) => api.post(`/tournaments/${tournamentId}/chat`, { text }),
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['tournament-chat', tournamentId] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to send message');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatData?.messages]);

  if (!canAccessChat) {
    return (
      <Card variant="glass" className="rounded-[28px] p-8 text-center space-y-4 border-amber-500/30">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h3 className="text-base font-extrabold text-foreground">Tournament Chat Locked</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {userStatus === 'PENDING'
              ? 'Registration pending organizer approval. Chat access will unlock once your team is approved.'
              : userStatus === 'REJECTED'
              ? 'Your registration for this tournament was rejected.'
              : userStatus === 'WITHDRAWN'
              ? 'You have withdrawn from this tournament.'
              : 'Official tournament chat is restricted exclusively to approved participants and organizers.'}
          </p>
        </div>
      </Card>
    );
  }

  const messages = chatData?.messages || [];

  return (
    <Card variant="glass" className="rounded-[28px] overflow-hidden border-white/10 flex flex-col h-[520px]">
      <CardHeader className="py-3 px-6 border-b border-white/10 flex flex-row items-center justify-between shrink-0 bg-card/40">
        <CardTitle className="text-sm font-extrabold flex items-center gap-2 text-foreground">
          <MessageSquare className="h-4 w-4 text-emerald-400" />
          Tournament Lobby Chat
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-mono text-muted-foreground">LIVE ROOM</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-y-auto space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-xs text-muted-foreground">Loading chat messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-xs text-muted-foreground space-y-1">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="font-bold">No messages yet</p>
            <p className="text-[11px]">Be the first approved player to say hello!</p>
          </div>
        ) : (
          messages.map((msg: any) => (
            <div key={msg.id} className="flex items-start gap-2.5 text-xs">
              <Avatar className="h-7 w-7 border border-white/10 shrink-0 mt-0.5">
                <AvatarImage src={msg.sender?.avatar} />
                <AvatarFallback className="text-[10px] bg-card">{getInitials(msg.sender?.username || 'U')}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground text-[11px]">{msg.sender?.username || 'User'}</span>
                  {msg.sender?.isOrganizer && (
                    <span className="text-[9px] font-mono bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded">
                      ORGANIZER
                    </span>
                  )}
                  <span className="text-[9px] text-muted-foreground font-mono">
                    {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-card/70 border border-white/10 text-foreground text-xs leading-relaxed break-words">
                  {msg.content || msg.text}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-3 border-t border-white/10 bg-card/60 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (messageText.trim()) {
              sendMut.mutate(messageText.trim());
            }
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message to tournament players..."
            className="rounded-xl border-white/10 bg-background/50 text-xs h-10"
            disabled={sendMut.isPending}
          />
          <Button
            type="submit"
            disabled={sendMut.isPending || !messageText.trim()}
            className="rounded-xl h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
