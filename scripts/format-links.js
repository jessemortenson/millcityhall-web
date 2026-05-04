#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

// Matches a blockquote line containing only a link, e.g. "  > [URL](URL)" or "  > https://..."
const BLOCKQUOTE_LINK_ONLY = /^(\s*)>\s+(\[([^\]]*)\]\(((?:[^()]+|\([^()]*\))*)\)|https?:\/\/\S+)\s*$/;

// Matches an indented sub-bullet containing only a link, e.g. "    - [URL](URL)"
// Requires at least one leading space so top-level bullets are excluded.
const SUB_BULLET_LINK_ONLY = /^(\s+)-\s+(\[([^\]]*)\]\(((?:[^()]+|\([^()]*\))*)\)|https?:\/\/\S+)\s*$/;

// Matches a markdown link [text](url), allowing balanced parens in the url
const MD_LINK = /\[([^\]]+)\]\(((?:[^()]+|\([^()]*\))*)\)/g;

function leadingSpaces(line) {
  const m = line.match(/^( *)/);
  return m ? m[1].length : 0;
}

function extractUrl(match) {
  // group 4 = url from [text](url); group 2 = bare url
  return match[4] || match[2];
}

// Returns the URL to merge if nextLine is a link-only sub-item of currentLine,
// otherwise returns null.
function mergeableUrl(currentLine, nextLine) {
  const bq = nextLine.match(BLOCKQUOTE_LINK_ONLY);
  if (bq) return extractUrl(bq);

  const sb = nextLine.match(SUB_BULLET_LINK_ONLY);
  if (sb && sb[1].length > leadingSpaces(currentLine)) return extractUrl(sb);

  return null;
}

// Replaces [URL](URL) self-referential links with [(source)](URL).
function replaceSelfRefLinks(line) {
  return line.replace(MD_LINK, (match, text, url) => {
    return text === url ? `[(source)](${url})` : match;
  });
}

function processLines(lines) {
  const result = [];
  let i = 0;

  while (i < lines.length) {
    // Apply self-referential link replacement to current line
    let line = replaceSelfRefLinks(lines[i]);
    let j = i + 1;

    // Greedily consume consecutive link-only sub-lines and append them
    while (j < lines.length) {
      const url = mergeableUrl(lines[i], lines[j]);
      if (!url) break;
      line = line.trimEnd() + ` [(source)](${url})`;
      j++;
    }

    result.push(line);
    i = j;
  }

  return result;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/format-links.js <file1.md> [file2.md ...]');
  process.exit(1);
}

for (const filePath of args) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`Not found: ${absPath}`);
    continue;
  }

  const original = fs.readFileSync(absPath, 'utf8');
  const processed = processLines(original.split('\n')).join('\n');

  if (processed === original) {
    console.log(`No changes: ${filePath}`);
    continue;
  }

  fs.writeFileSync(absPath, processed, 'utf8');
  console.log(`Updated: ${filePath}`);

  // Print a simple diff summary
  const origLines = original.split('\n');
  const newLines = processed.split('\n');
  const maxLen = Math.max(origLines.length, newLines.length);
  for (let k = 0; k < maxLen; k++) {
    if (origLines[k] !== newLines[k]) {
      console.log(`  line ${k + 1}:`);
      console.log(`    - ${origLines[k] ?? '(removed)'}`);
      console.log(`    + ${newLines[k] ?? '(removed)'}`);
    }
  }
}
