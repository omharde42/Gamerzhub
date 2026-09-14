'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar, Users, MapPin, Shield, Zap, Sparkles, Check } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CreateTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const GAME_PRESETS = [
  {
    name: 'PUBG Mobile / BGMI',
    gameKey: 'PUBG Mobile',
    maps: ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Nusa'],
    defaultCapacity: 24,
  },
  {
    name: 'PUBG PC',
    gameKey: 'PUBG PC',
    maps: ['Erangel', 'Miramar', 'Taego', 'Vikendi', 'Rondo'],
    defaultCapacity: 16,
  },
  {
    name: 'Free Fire MAX',
    gameKey: 'Free Fire MAX',
    maps: ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra'],
    defaultCapacity: 48,
  },
  {
    name: 'Valorant',
    gameKey: 'Valorant',
    maps: ['Ascent', 'Bind', 'Haven', 'Split', 'Lotus', 'Sunset'],
    defaultCapacity: 16,
  },
  {
    name: 'CS2',
    gameKey: 'CS2',
    maps: ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Ancient', 'Anubis'],
    defaultCapacity: 16,
  },
];

export function CreateTournamentDialog({ open, onOpenChange, onSuccess }: CreateTournamentDialogProps) {
  const queryClient = useQueryClient();

  const [game, setGame] = useState('PUBG Mobile');
  const [formatMode, setFormatMode] = useState<'SOLO' | 'DUO' | 'SQUAD'>('SQUAD');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxTeams, setMaxTeams] = useState(24);
  const [prizePool, setPrizePool] = useState(0);
  const [entryFee, setEntryFee] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [registrationEnd, setRegistrationEnd] = useState('');
  const [selectedMaps, setSelectedMaps] = useState<string[]>(['Erangel', 'Miramar']);
  const [rules, setRules] = useState('');
  const [isDraft, setIsDraft] = useState(false);

  const selectedPreset = GAME_PRESETS.find((p) => p.gameKey === game) || GAME_PRESETS[0];

  const handleGameChange = (newGame: string) => {
    setGame(newGame);
    const preset = GAME_PRESETS.find((p) => p.gameKey === newGame);
    if (preset) {
      setSelectedMaps(preset.maps.slice(0, 2));
      setMaxTeams(preset.defaultCapacity);
    }
  };

  const toggleMap = (mapName: string) => {
    if (selectedMaps.includes(mapName)) {
      setSelectedMaps(selectedMaps.filter((m) => m !== mapName));
    } else {
      setSelectedMaps([...selectedMaps, mapName]);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description,
        game,
        formatMode,
        type: 'BATTLE_ROYALE',
        maxTeams: Number(maxTeams),
        prizePool: Number(prizePool) || 0,
        entryFee: Number(entryFee) || 0,
        startDate: startDate ? new Date(startDate).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        registrationEnd: registrationEnd ? new Date(registrationEnd).toISOString() : undefined,
        mapPool: selectedMaps,
        rules,
        status: isDraft ? 'DRAFT' : 'REGISTRATION_OPEN',
      };
      const res = await api.post('/tournaments', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success(isDraft ? 'Tournament saved as Draft!' : 'Tournament published successfully!');
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['landing-tournaments'] });
      onOpenChange(false);
      resetForm();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create tournament');
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPrizePool(0);
    setEntryFee(0);
    setStartDate('');
    setRegistrationEnd('');
    setRules('');
    setIsDraft(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A0E1A] border-white/15 text-foreground rounded-3xl max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 backdrop-blur-xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Trophy className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-white">Create Tournament</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Setup esports tournaments for PUBG, Free Fire, or custom titles with capacity, maps & registration windows.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-5 pt-2"
        >
          {/* Game & Preset Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Esports Title *</label>
              <Select value={game} onValueChange={handleGameChange}>
                <SelectTrigger className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white">
                  <SelectValue placeholder="Select Game" />
                </SelectTrigger>
                <SelectContent className="glass-popup border-emerald-500/30">
                  {GAME_PRESETS.map((p) => (
                    <SelectItem key={p.gameKey} value={p.gameKey}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format Mode (Solo/Duo/Squad) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Format Mode *</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['SOLO', 'DUO', 'SQUAD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormatMode(m)}
                    className={`h-10 rounded-xl text-xs font-extrabold transition-all border ${
                      formatMode === m
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Tournament Name *</label>
            <Input
              placeholder="e.g. PUBG Erangel Squad Championship S1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Description</label>
            <Textarea
              placeholder="Short overview of the tournament, prize pool distribution, and schedule..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[70px] rounded-xl bg-card/60 border-white/10 text-xs text-white"
            />
          </div>

          {/* Dates & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Start Date & Time *</label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Registration End</label>
              <Input
                type="datetime-local"
                value={registrationEnd}
                onChange={(e) => setRegistrationEnd(e.target.value)}
                className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Squad Capacity *</label>
              <Input
                type="number"
                min={2}
                max={256}
                value={maxTeams}
                onChange={(e) => setMaxTeams(parseInt(e.target.value) || 16)}
                required
                className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Prize Pool & Entry Fee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Prize Pool ($ / ₹)</label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={prizePool || ''}
                onChange={(e) => setPrizePool(parseFloat(e.target.value) || 0)}
                className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-emerald-400 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Entry Fee ($ / ₹)</label>
              <Input
                type="number"
                min={0}
                placeholder="0 (Free)"
                value={entryFee || ''}
                onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                className="h-10 rounded-xl bg-card/60 border-white/10 text-xs text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Map Pool Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Map Rotation</span>
              <span className="text-[10px] text-emerald-400 font-mono">{selectedMaps.length} selected</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedPreset.maps.map((m) => {
                const isSelected = selectedMaps.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMap(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-emerald-400" />}
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Rules & Regulations</label>
            <Textarea
              placeholder="e.g. No emulators allowed. Must submit screenshot proof after match."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="min-h-[60px] rounded-xl bg-card/60 border-white/10 text-xs text-white"
            />
          </div>

          {/* Draft vs Publish Option & Actions */}
          <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="rounded border-white/20 bg-card text-emerald-500 focus:ring-emerald-500 h-4 w-4"
              />
              <span>Save as Draft (Publish later from control hub)</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none h-10 px-5 rounded-xl border-white/10 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!title.trim() || !startDate || createMutation.isPending}
                className="flex-1 sm:flex-none h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/20"
              >
                {createMutation.isPending ? 'Creating...' : isDraft ? 'Save Draft' : 'Publish Tournament'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
