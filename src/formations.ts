import * as fs from 'fs';
import * as util from 'util';

function getPoints(diagram: string[], y, x): Array<[number, number]> {
  const points = [];
  for (let i = 0; i < diagram.length; i++) {
    for (let j = 0; j < diagram[i].length; j++) {
      if (diagram[i].charAt(j) === 'x') {
        if (x !== j || y !== i) points.push([j - x, i - y]);
      }
    }
  }
  return points;
}

type Formation = {
  name: string;
  difficulty: number;
  diagram?: string[];
  size?: number;
};

function parseFormation(lines): Formation {
  const signature = lines[0].replace(/^=+|=+$/g, '').trim();
  return {
    name: signature.split('(')[0].trim(),
    difficulty: parseInt(signature.split('(')[1].replace(/^\(|\)$/g, '').trim(), 10),
    diagram: lines.slice(1),
  };
}

function parse(file) {
  const formations = {};
  let buffer = [];
  const lines = file.split('\n');
  lines.forEach((line, i) => {
    if (i === lines.length - 1 && line[i] === '') return;
    if (line.charAt(0) === '=') {
      if (buffer.length > 0) {
        const formation = parseFormation(buffer);
        formations[formation.name] = formation;
        buffer = [];
      }
    }
    buffer.push(line);
  });
  const formation = parseFormation(buffer);
  formations[formation.name] = formation;
  return formations;
}

export function getFormations(): {[id: string]: Formation} {
  const formations = parse(fs.readFileSync('formations.txt', 'utf-8'));
  for (const name in formations) {
    const formation = formations[name];
    formation.map = [];
    for (const i in formation.diagram) {
      formation.map[i] || (formation.map[i] = []);
      for (let j = 0; j < formation.diagram[i].length; j++) {
        const c = formation.diagram[i].charAt(j);
        if (c === 'x') {
          formation.map[i][j] = true;
          if (!formation.points) formation.points = getPoints(formation.diagram, i, j);
        }
      }
    }

    if (!formation.points) {
      // malformed formation?
      console.log('Formation ' + formation.name + ' is malformed!');
      continue;
    }

    formation.size = formation.points.length + 1;
    formations[name] = formation;
    delete formation.diagram;
  }
  return formations;
}

export function sizeRange(formations: {[id: string]: Formation}): [number, number] {
  let maxSize = 0;
  let minSize = Infinity;
  for (const id in formations) {
    minSize = Math.min(minSize, formations[id].size);
    maxSize = Math.max(maxSize, formations[id].size);
  }
  return [minSize, maxSize];
}
