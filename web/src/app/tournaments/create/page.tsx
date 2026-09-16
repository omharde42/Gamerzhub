'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, ArrowLeft, Loader2, Calendar, DollarSign, Users, Shield } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { fireCelebration } from '@/components/hud/celebration';

export default function CreateTournamentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    game: 'Free Fire',
    format: 'SINGLE_ELIMINATION',
    maxTeams: 16,
    prizePool: 500,
    startDate: '',
    rules: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.startDate) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/tournaments', {
        title: formData.title.trim(),
        description: formData.description.trim(),
        game: formData.game,
        format: formData.format,
        maxTeams: Number(formData.maxTeams),
        prizePool: Number(formData.prizePool),
        startDate: new Date(formData.startDate).toISOString(),
        rules: formData.rules.trim(),
      });

      toast.success('Tournament created successfully!');
      fireCelebration('Tournament published!', 'The arena is open — players can now register.');
      router.push(`/tournaments/${data.data?.id || ''}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create tournament';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-gaming-purple" />
            Create Tournament
          </h1>
          <p className="text-xs text-muted-foreground">Host your esports tournament on GamerHub</p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="glass" className="border-border/60">
          <CardHeader>
            <CardTitle>Tournament Details</CardTitle>
            <CardDescription>Fill out the configuration settings for your tournament.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Tournament Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Valorant Summer Showdown #1"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="game">Game Title *</Label>
                  <Select
                    value={formData.game}
                    onValueChange={(val) => setFormData({ ...formData, game: val })}
                  >
                    <SelectTrigger id="game">
                      <SelectValue placeholder="Select Game" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free Fire">Free Fire</SelectItem>
                      <SelectItem value="PUBG">PUBG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="format">Tournament Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(val) => setFormData({ ...formData, format: val })}
                  >
                    <SelectTrigger id="format">
                      <SelectValue placeholder="Select Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE_ELIMINATION">Single Elimination</SelectItem>
                      <SelectItem value="DOUBLE_ELIMINATION">Double Elimination</SelectItem>
                      <SelectItem value="ROUND_ROBIN">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxTeams" className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Max Teams
                  </Label>
                  <Input
                    id="maxTeams"
                    type="number"
                    min={2}
                    max={128}
                    value={formData.maxTeams}
                    onChange={(e) => setFormData({ ...formData, maxTeams: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prizePool" className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" /> Prize Pool ($)
                  </Label>
                  <Input
                    id="prizePool"
                    type="number"
                    min={0}
                    value={formData.prizePool}
                    onChange={(e) => setFormData({ ...formData, prizePool: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startDate" className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Start Date & Time *
                  </Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Overview of the tournament, bracket info, stream links..."
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rules">Rules & Guidelines</Label>
                <Textarea
                  id="rules"
                  placeholder="Specify match rules, map vetos, server locations, dispute policy..."
                  rows={3}
                  value={formData.rules}
                  onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Link href="/tournaments">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" variant="gradient" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                  Publish Tournament
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
