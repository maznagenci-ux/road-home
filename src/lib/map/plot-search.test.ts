import { describe, expect, it } from 'vitest';
import {
  filterPlotPointers,
  plotRangeLabel,
  withPlotSeq,
} from '@/lib/map/plot-search';
import type { CompoundPointer } from '@/features/map/CompoundPlotCanvas';

function ptr(no: string, id = no): CompoundPointer {
  return { id, no, x: 0, y: 0, lat: 0, lng: 0 };
}

describe('land plot numbers', () => {
  it('keeps map number 1 as 1 after sort (never remaps to 2891)', () => {
    const list = withPlotSeq([ptr('2891', 'a'), ptr('1', 'b'), ptr('2', 'c')]);
    expect(list.map((p) => p.no)).toEqual(['1', '2', '2891']);
    expect(list.find((p) => p.id === 'b')?.no).toBe('1');
    expect(list.find((p) => p.id === 'a')?.no).toBe('2891');
  });

  it('search for 1 returns plot 1, not 10 or 2891', () => {
    const list = withPlotSeq([ptr('1'), ptr('10'), ptr('11'), ptr('2891')]);
    const hits = filterPlotPointers(list, '1');
    expect(hits).toHaveLength(1);
    expect(hits[0]?.no).toBe('1');
  });

  it('slicing the list (pagination) does not change plot numbers', () => {
    const list = withPlotSeq([ptr('1'), ptr('2'), ptr('3'), ptr('4')]);
    const page2 = list.slice(2, 4);
    expect(page2.map((p) => p.no)).toEqual(['3', '4']);
  });

  it('range label uses stored map numbers', () => {
    const list = withPlotSeq([ptr('1'), ptr('5578')]);
    expect(plotRangeLabel(list)).toBe('1 – 5578');
  });
});
