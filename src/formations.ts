import * as fs from 'fs';
import * as path from 'path';

function getPoints(diagram: string[], y: number, x: number): Array<[number, number]> {
  const points: [number, number][] = [];
  for (let row = 0; row < diagram.length; row++) {
    for (let col = 0; col < diagram[row].length; col++) {
      if (diagram[row].charAt(col) === 'x') {
        if (x !== col || y !== row) points.push([col - x, row - y]);
      }
    }
  }
  return points;
}

export type FormationDefinition = {
  name: string;
  time: number;
  diagram: string[];
};

export type Formation = {
  name: string;
  map: boolean[][];
  points: [number, number][];
  time: number;
  size: number;
};

function parseFormation(lines: string[]): FormationDefinition {
  const signature = lines[0].replace(/^=+|=+$/g, '').trim();
  return {
    name: signature.split('(')[0].trim(),
    time: parseInt(
      signature
        .split('(')[1]
        .replace(/^\(|\)$/g, '')
        .trim(),
      10
    ),
    diagram: lines.slice(1),
  };
}

function parse(file: string): FormationDefinition[] {
  const formations: FormationDefinition[] = [];
  let buffer: string[] = [];
  const lines = file.split('\n');
  lines.forEach((line, i) => {
    if (i === lines.length - 1 && line[i] === '') return;
    if (line.charAt(0) === '=') {
      if (buffer.length > 0) {
        const formation = parseFormation(buffer);
        formations.push(formation);
        buffer = [];
      }
    }
    buffer.push(line);
  });
  formations.push(parseFormation(buffer));
  return formations;
}

export function getFormations(): Formation[] {
  return parse(fs.readFileSync(path.join(__dirname, '../formations.txt'), 'utf-8'))
    .map(({name, diagram, time}): Formation | null => {
      const map: boolean[][] = [];
      let points;
      for (let i = 0; i < diagram.length; i++) {
        map[i] || (map[i] = []);
        for (let j = 0; j < diagram[i].length; j++) {
          const c = diagram[i].charAt(j);
          if (c === 'x') {
            map[i][j] = true;
            if (!points) points = getPoints(diagram, i, j);
          }
        }
      }

      if (!points) {
        // malformed formation?
        console.log(`Formation ${name} is malformed!`);
        return null;
      }

      return {name, map, points, time, size: points.length + 1} as Formation;
    })
    .filter(Boolean) as Formation[];
}
