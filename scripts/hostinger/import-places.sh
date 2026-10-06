#!/usr/bin/env bash
set -euo pipefail
cd /var/www/road-home/.next/standalone 2>/dev/null || cd /var/www/road-home

node <<'NODE'
const { readFileSync } = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const root = '/var/www/road-home';
const file = path.join(root, 'public', 'data', 'compounds', 'index.json');

(async () => {
  const rows = JSON.parse(readFileSync(file, 'utf8'));
  const names = [];
  const seen = new Set();
  for (const r of rows) {
    const name = String(r.title || r.titleEn || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }

  const existing = await prisma.place.findMany({ select: { name: true, code: true } });
  const existingNames = new Set(existing.map((p) => p.name.trim().toLowerCase()));

  let next = 100;
  for (const p of existing) {
    const n = Number.parseInt(String(p.code).replace(/\D/g, ''), 10);
    if (Number.isFinite(n) && n >= next) next = n + 1;
  }

  let created = 0;
  let skipped = 0;
  for (const name of names) {
    if (existingNames.has(name.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const code = String(next);
    next += 1;
    await prisma.place.create({
      data: {
        code,
        name,
        neighborhood: name,
        province: 'هەولێر',
        city: 'هەولێر',
        plotNo: '',
      },
    });
    // Keep house in sync (minimal upsert)
    await prisma.house.upsert({
      where: { code },
      create: {
        code,
        name,
        location: name,
        status: 'IN_CONSTRUCTION',
      },
      update: { name, location: name },
    });
    existingNames.add(name.toLowerCase());
    created += 1;
  }

  const total = await prisma.place.count();
  console.log(JSON.stringify({ totalMaps: names.length, created, skipped, totalPlaces: total, nextCode: String(next) }));
  await prisma.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
NODE
