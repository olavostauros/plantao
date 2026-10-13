import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Regras de segurança do workflow do Pages (auditoria de 2026-10-13, P-004 e P-005).
const workflow = readFileSync(new URL('../.github/workflows/pages.yml', import.meta.url), 'utf8');

describe('workflow do Pages', () => {
  it('fixa toda action por SHA de commit, com a tag em comentário (P-004)', () => {
    const uses = [...workflow.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)(.*)$/gm)];
    expect(uses.length).toBeGreaterThan(0);
    for (const [, ref, rest] of uses) {
      expect(ref).toMatch(/^[\w.-]+\/[\w.-]+(\/[\w./-]+)?@[0-9a-f]{40}$/);
      expect(rest).toMatch(/#\s*v\d/);
    }
  });

  it('só faz merge do commit que passou nos gates (P-005)', () => {
    const merges = workflow.split('\n').filter((l) => l.includes('gh pr merge'));
    expect(merges).toHaveLength(1);
    expect(merges[0]).toContain('--match-head-commit "$HEAD_SHA"');
    expect(workflow).toMatch(/HEAD_SHA:\s*\$\{\{\s*github\.event\.pull_request\.head\.sha\s*\}\}/);
  });
});
