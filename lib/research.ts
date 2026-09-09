import type { ModelUse, ModelScan } from './models';
export const categories = [
  'All',
  'Mathematics',
  'Computer science',
  'Physics',
  'Life sciences',
  'Humanities',
  'Other',
];
export const kinds = ['Result', 'Hypothesis', 'Replication', 'Negative result'];
export type Paper = {
  id: string;
  title: string;
  author: string;
  authorHandle?: string;
  shared?: boolean;
  sharedBy?: string;
  sharedByHandle?: string;
  publishedAt?: string;
  pages?: number;
  abstract: string;
  category: string;
  kind: string;
  createdAt: string;
  method: string;
  limitations: string;
  aiUse: string;
  models?: ModelUse[];
  modelScan?: ModelScan;
  license: string;
  pdfUrl: string;
  sourceUrl: string;
  fileSize: number;
  comments: number;
  mine?: boolean;
  withdrawn?: boolean;
};
export type Comment = {
  id: string;
  author: string;
  authorHandle?: string;
  body: string;
  kind: string;
  createdAt: string;
  mine?: boolean;
};
export const inaugural: Paper = {
  id: 'or-2026-0001',
  title:
    'Exact Local Exchange Profiles and Reconfiguration Barriers for Isosceles-Triangle-Free Grid Sets',
  author: 'Pierre-Baptiste Borges',
  authorHandle: 'pierre-baptiste-borges',
  abstract:
    'How can a grid point set be modified without creating an isosceles triangle? This work introduces two local profiles: points that become individually admissible after deletions, and points that can actually be added together. It establishes exact profiles around two public AlphaEvolve configurations and lower bounds on the changes required to reach another configuration of equal or greater size.',
  category: 'Mathematics',
  kind: 'Result',
  createdAt: '2026-09-08T21:00:00.000Z',
  method:
    'Vertex-cover reductions, antichains of minimal masks and exact searches. On the 100 × 100 grid, the bounds at radii 6 and 7 use independently regenerated SAT instances and verified DRAT certificates. The value at radius 8 uses a directly verified witness and a separately audited exhaustive search.',
  limitations:
    'The radius-8 upper bound has no portable DRAT/LRAT proof trace. Neither configuration is claimed to be globally optimal. The reconfiguration barrier is a lower bound, not an exact value.',
  aiUse:
    'Generative language tools, including OpenAI Codex, assisted with computational exploration, code development, literature searches and writing. The human author is responsible for the manuscript, results, references and supporting artifacts.',
  license: 'CC BY 4.0',
  pdfUrl: '/papers/local-exchange-profiles.pdf',
  sourceUrl: 'https://github.com/Liftof/local-exchange-profiles',
  fileSize: 387072,
  comments: 0,
  publishedAt: '2026-08-27',
  pages: 15,
};
export function dateLabel(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}
export function citation(p: Paper, origin: string) {
  const safe = (x: string) => x.replace(/[{}\\]/g, '');
  return `@misc{${p.id.replaceAll('-', '')},\n  author = {${safe(p.author)}},\n  title = {${safe(p.title)}},\n  year = {${new Date(p.publishedAt || p.createdAt).getUTCFullYear()}},\n  howpublished = {${p.shared ? 'Preprint' : 'Open Research, preprint'}},\n  url = {${safe(p.shared ? p.pdfUrl : `${origin}/publication/${p.id}`)}}\n}`;
}

export type Author = {
  id: string;
  handle: string;
  name: string;
  bio: string;
  website: string;
  createdAt: string;
};
export const foundingAuthor: Author = {
  id: 'author-pb',
  handle: 'pierre-baptiste-borges',
  name: 'Pierre-Baptiste Borges',
  bio: 'Independent researcher.',
  website: 'https://github.com/Liftof/local-exchange-profiles',
  createdAt: '2026-09-08T21:00:00.000Z',
};
export type Session = {
  signedIn: boolean;
  author: Author | null;
  suggestedName: string;
  suggestedHandle?: string;
};
export const legacyLabels: Record<string, string> = {
  Mathématiques: 'Mathematics',
  Informatique: 'Computer science',
  Physique: 'Physics',
  'Sciences du vivant': 'Life sciences',
  'Sciences humaines': 'Humanities',
  Autres: 'Other',
  Résultat: 'Result',
  Hypothèse: 'Hypothesis',
  Réplication: 'Replication',
  'Résultat négatif': 'Negative result',
  'Tous droits réservés': 'All rights reserved',
  Relecture: 'Review',
};
