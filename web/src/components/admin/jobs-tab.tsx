'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase,
  Plus,
  Search,
  Trash2,
  Users,
  MapPin,
  DollarSign,
  Gamepad2,
  Calendar,
  Building2,
  Loader2,
  X,
  CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface JobListing {
  id: string;
  title: string;
  description: string;
  type: string;
  location?: string;
  salary?: string;
  game?: string;
  rankRequired?: string;
  requirements: string[];
  createdAt: string;
  organization: {
    id: string;
    name: string;
    avatar?: string;
    verified: boolean;
  };
  _count: {
    applications: number;
  };
}

const JOB_TYPES = ['PLAYER', 'COACH', 'ANALYST', 'MANAGER', 'CONTENT_CREATOR', 'STAFF'];

export function AdminJobsTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'PLAYER',
    location: 'Remote',
    salary: 'Competitive',
    game: 'Valorant',
    rankRequired: 'Immortal+',
    requirements: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-jobs', page, search, typeFilter],
    queryFn: async () => {
      const res = await api.get('/admin/jobs', {
        params: {
          page,
          limit: 15,
          search: search || undefined,
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
        },
      });
      return res.data;
    },
  });

  const jobs: JobListing[] = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Create Job Mutation
  const createJobMutation = useMutation({
    mutationFn: async () => {
      if (!formData.title || !formData.description) {
        throw new Error('Title and description are required');
      }
      const reqList = formData.requirements
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      return api.post('/admin/jobs', {
        ...formData,
        requirements: reqList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      toast.success('Official job posting created');
      setIsModalOpen(false);
      setFormData({
        title: '',
        description: '',
        type: 'PLAYER',
        location: 'Remote',
        salary: 'Competitive',
        game: 'Valorant',
        rankRequired: 'Immortal+',
        requirements: '',
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to create job');
    },
  });

  // Delete Job Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/admin/jobs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
      toast.success('Job posting removed');
      setDeleteConfirmId(null);
    },
    onError: () => toast.error('Failed to remove job posting'),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">Esports Careers &amp; Jobs Board</h2>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              {meta.total} Openings
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage official scouting calls, pro team recruitments, and esports organization postings
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 h-9 text-xs font-semibold shrink-0">
          <Plus className="h-4 w-4" /> Post Official Opportunity
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search job title, game, or location..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="h-9 pl-9 text-xs bg-card/40 border-border/60"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="h-9 px-3 rounded-lg text-xs bg-card border border-border/60 text-foreground focus:outline-none"
        >
          <option value="ALL">All Roles</option>
          {JOB_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60 bg-card/40">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-3 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/20">
          <CardContent className="p-12 text-center space-y-2">
            <Briefcase className="h-8 w-8 text-muted-foreground mx-auto" />
            <h3 className="text-sm font-semibold text-foreground">No job opportunities listed</h3>
            <p className="text-xs text-muted-foreground">Post esports scouting calls and professional team openings.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="border border-border/60 bg-card/40 flex flex-col justify-between">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground">{job.title}</h3>
                      <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {job.type}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-primary" /> {job.organization?.name || 'GamerZ Hub'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {job.location || 'Remote'}
                      </span>
                    </div>
                  </div>

                  {deleteConfirmId === job.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(job.id)}
                        disabled={deleteMutation.isPending}
                        className="h-7 px-2 text-[10px]"
                      >
                        Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(null)}
                        className="h-7 px-1.5 text-[10px]"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(job.id)}
                      className="h-8 px-2 text-xs text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {job.description}
                </p>

                {/* Badges / Attributes */}
                <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1">
                  {job.game && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      <Gamepad2 className="h-3 w-3 text-primary" /> {job.game}
                    </span>
                  )}
                  {job.rankRequired && (
                    <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                      Rank: {job.rankRequired}
                    </span>
                  )}
                  {job.salary && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400">
                      <DollarSign className="h-3 w-3" /> {job.salary}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-2 border-t border-border/40">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3 text-primary" /> {job._count.applications} Applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {new Date(job.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-base text-foreground">Post Esports Scouting Opportunity</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground rounded-lg p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createJobMutation.mutate();
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Position Title *</label>
                <Input
                  required
                  placeholder="e.g. Valorant Tier-2 Main Duelist / Entry Fragger"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="text-xs bg-muted/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Role Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Game</label>
                  <Input
                    placeholder="e.g. Valorant / CS2 / BGMI"
                    value={formData.game}
                    onChange={(e) => setFormData({ ...formData, game: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Location</label>
                  <Input
                    placeholder="e.g. Remote / Boot camp (EU/NA)"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Compensation / Salary</label>
                  <Input
                    placeholder="e.g. $1,500/mo + Prize cut"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="text-xs bg-muted/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Rank Required</label>
                <Input
                  placeholder="e.g. Radiant / Faceit Level 10 / Master+"
                  value={formData.rankRequired}
                  onChange={(e) => setFormData({ ...formData, rankRequired: e.target.value })}
                  className="text-xs bg-muted/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Description *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe the opportunity, practice schedule, and tournament commitments..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Requirements (One per line)
                </label>
                <textarea
                  rows={2}
                  placeholder="Must have Discord with mic&#10;18+ age&#10;Available evenings 8-11pm IST"
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  className="w-full p-2.5 rounded-lg text-xs bg-muted/20 border border-border text-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="h-9 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createJobMutation.isPending}
                  className="h-9 text-xs font-semibold gap-1.5"
                >
                  {createJobMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Publish Opening
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
