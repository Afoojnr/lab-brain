'use client';

import { motion } from 'motion/react';

import type { Project } from '../types';
import { ProjectCard } from './project-card';

const MAX_STAGGERED_ITEMS = 8;
const STAGGER_SECONDS = 0.05;

/**
 * Responsive grid of projects. Cards ease in one after another on first load,
 * and a newly created card enters while the others slide to make room (`layout`).
 */
export const ProjectGrid = ({ projects }: { projects: Project[] }) => (
  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {projects.map((project, index) => (
      <motion.li
        key={project.id}
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: 'spring',
          bounce: 0,
          duration: 0.45,
          delay: Math.min(index, MAX_STAGGERED_ITEMS) * STAGGER_SECONDS
        }}
      >
        <ProjectCard project={project} />
      </motion.li>
    ))}
  </ul>
);
