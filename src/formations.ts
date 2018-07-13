import * as fs from 'fs';
import * as path from 'path';

function getPoints(diagram: string[], y: number, x: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < diagram.length; i++) {
    for (let j = 0; j < diagram[i].length; j++) {
      if (diagram[i].charAt(j) === 'x') {
        if (x !== j || y !== i) points.push([j - x, i - y]);
      }
    }
  }
  return points;
}

export type FormationDefinition = {
  name: string;
  difficulty: number;
  diagram?: string[];
  size?: number;
};

export type Formation = FormationDefinition & {
  map: boolean[][];
  points: Array<[number, number]>;
};

function parseFormation(lines: string[]): FormationDefinition {
  const signature = lines[0].replace(/^=+|=+$/g, '').trim();
  return {
    name: signature.split('(')[0].trim(),
    difficulty: parseInt(
      signature
        .split('(')[1]
        .replace(/^\(|\)$/g, '')
        .trim(),
      10
    ),
    diagram: lines.slice(1),
  };
}

function parse(file: string) {
  const formations: {[name: string]: FormationDefinition} = {};
  let buffer: string[] = [];
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
  const formations = parse(fs.readFileSync(path.join(__dirname, '../formations.txt'), 'utf-8')) as {
    [id: string]: Formation;
  };
  for (const name in formations) {
    const formation = formations[name];
    formation.map = [];
    for (let i = 0; i < formation.diagram.length; i++) {
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

    formation.size = formation.points.length;
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
