import { describe, it, expect } from 'vitest';
import {
  baseNoteSchema,
  dsaSchema,
  roadmapNodeSchema,
} from '~/content/schemas';

describe('content schemas', () => {
  describe('baseNoteSchema (notes)', () => {
    it('accepts a minimal valid note', () => {
      const result = baseNoteSchema.parse({
        title: 'TCP / UDP / TLS',
        phase: '01-foundations',
        order: 1,
      });
      expect(result.title).toBe('TCP / UDP / TLS');
      expect(result.premium).toBe(false);
      expect(result.previewParagraphs).toBe(4);
      expect(result.prerequisites).toEqual([]);
    });

    it('rejects a phase that does not match NN-kebab format', () => {
      expect(() =>
        baseNoteSchema.parse({
          title: 'x',
          phase: 'foundations',
          order: 1,
        }),
      ).toThrowError(/05-distributed-systems/);
    });

    it('rejects negative order', () => {
      expect(() =>
        baseNoteSchema.parse({
          title: 'x',
          phase: '01-foundations',
          order: -1,
        }),
      ).toThrow();
    });

    it('rejects an empty title', () => {
      expect(() =>
        baseNoteSchema.parse({ title: '', phase: '01-foundations', order: 0 }),
      ).toThrow();
    });
  });

  describe('dsaSchema', () => {
    it('extends notes with complexity + relatedAnims + commonPitfalls', () => {
      const result = dsaSchema.parse({
        title: 'Quicksort',
        phase: '02-sorting',
        order: 1,
        tags: ['sorting'],
        complexity: { time: 'O(n log n)', space: 'O(log n)' },
        relatedAnims: ['quicksort'],
      });
      expect(result.complexity?.time).toBe('O(n log n)');
      expect(result.relatedAnims).toEqual(['quicksort']);
      expect(result.commonPitfalls).toEqual([]);
    });

    it('restricts tags to the AnimTag enum', () => {
      expect(() =>
        dsaSchema.parse({
          title: 'x',
          phase: '02-sorting',
          order: 0,
          tags: ['not-a-real-tag'],
        }),
      ).toThrow();
    });
  });

  describe('roadmapNodeSchema', () => {
    it('accepts a minimal node', () => {
      const node = roadmapNodeSchema.parse({
        pillar: 'systems',
        target: 'raft-consensus',
        label: 'Raft',
        phase: '05-distributed-systems',
        order: 2,
      });
      expect(node.requires).toEqual([]);
      expect(node.premium).toBe(false);
    });

    it('rejects unknown pillar values', () => {
      expect(() =>
        roadmapNodeSchema.parse({
          pillar: 'frontend',
          target: 'x',
          label: 'X',
          phase: '01-foundations',
          order: 0,
        }),
      ).toThrow();
    });
  });
});
