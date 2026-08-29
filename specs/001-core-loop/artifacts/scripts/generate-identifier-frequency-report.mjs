import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const SOURCE_DIR = path.resolve('src');
const OUTPUT_FILE = path.resolve(
  'specs/001-core-loop/artifacts/identifier-frequency.html',
);
const SOURCE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
];

const sourceFiles = await collectSourceFiles(SOURCE_DIR);
const frequencies = new Map();
const compilerOptions = readCompilerOptions();
const program = ts.createProgram({ rootNames: sourceFiles, options: compilerOptions });
const checker = program.getTypeChecker();

for (const filePath of sourceFiles) {
  const sourceFile = program.getSourceFile(filePath);
  if (sourceFile === undefined) {
    throw new Error(`TypeScript did not load ${filePath}`);
  }

  const diagnostics = program.getSyntacticDiagnostics(sourceFile);
  if (diagnostics.length > 0) {
    throw new Error(formatDiagnostic(diagnostics[0]));
  }

  visit(sourceFile);
}

const identifiers = [...frequencies.entries()].sort(
  ([leftName, leftCount], [rightName, rightCount]) =>
    rightCount - leftCount || leftName.localeCompare(rightName, 'en'),
);
const totalOccurrences = identifiers.reduce(
  (total, [, count]) => total + count,
  0,
);
const generatedAt = new Date().toISOString();
const html = renderHtml({
  identifiers,
  generatedAt,
  sourceFileCount: sourceFiles.length,
  totalOccurrences,
});

await mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
await writeFile(OUTPUT_FILE, html, 'utf8');

globalThis.console.log(
  `Identifier report: ${path.relative(globalThis.process.cwd(), OUTPUT_FILE)} ` +
    `(${identifiers.length} names, ${totalOccurrences} occurrences, ` +
    `${sourceFiles.length} files)`,
);

/**
 * Рекурсивно обходит AST исходного файла и считает идентификаторы проекта.
 * Для каждого Identifier TypeChecker определяет связанный символ. Имена,
 * объявленные только в стандартных lib.*.d.ts TypeScript, пропускаются, поэтому
 * глобальные API вроде Object и Math не смешиваются с локальной лексикой.
 * Узлы, которые парсер представляет как Identifier для ключевого слова
 * (например, const в выражении as const), также не учитываются.
 * Локальные имена, TypeScript-типы и явно импортированные имена сохраняются.
 *
 * @param {import('typescript').Node} node Текущий узел синтаксического дерева.
 */
function visit(node) {
  if (
    ts.isIdentifier(node) &&
    ts.identifierToKeywordKind(node) === undefined &&
    !isStandardLibraryIdentifier(node)
  ) {
    const name = node.text;
    frequencies.set(name, (frequencies.get(name) ?? 0) + 1);
  }

  ts.forEachChild(node, visit);
}

function isStandardLibraryIdentifier(node) {
  const symbol = checker.getSymbolAtLocation(node);
  const declarations = symbol?.getDeclarations();

  return (
    declarations !== undefined &&
    declarations.length > 0 &&
    declarations.every((declaration) =>
      program.isSourceFileDefaultLibrary(declaration.getSourceFile()),
    )
  );
}

function readCompilerOptions() {
  const configPath = path.resolve('tsconfig.json');
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error !== undefined) {
    throw new Error(formatDiagnostic(configFile.error));
  }

  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
  ).options;
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(entryPath)));
    } else if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right, 'en'));
}

function isSourceFile(fileName) {
  return SOURCE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (diagnostic.file === undefined || diagnostic.start === undefined) {
    return message;
  }

  const position = diagnostic.file.getLineAndCharacterOfPosition(
    diagnostic.start,
  );
  return `${diagnostic.file.fileName}:${position.line + 1}:${position.character + 1}: ${message}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderHtml({
  identifiers,
  generatedAt,
  sourceFileCount,
  totalOccurrences,
}) {
  const rows = identifiers
    .map(
      ([name, count]) => `
        <tr data-name="${escapeHtml(name.toLocaleLowerCase('en'))}" data-count="${count}">
          <td><code>${escapeHtml(name)}</code></td>
          <td class="count">${count}</td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Частотная карта идентификаторов</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { margin: 0 auto; max-width: 56rem; padding: 2rem 1rem; }
      h1 { margin-bottom: 0.35rem; }
      .meta { color: #777; margin: 0 0 1.5rem; }
      label { display: grid; gap: 0.4rem; font-weight: 600; }
      input { font: inherit; padding: 0.65rem 0.8rem; }
      table { border-collapse: collapse; margin-top: 1rem; width: 100%; }
      th, td { border-bottom: 1px solid #8886; padding: 0.55rem 0.7rem; text-align: left; }
      th { position: sticky; top: 0; background: Canvas; }
      th button { border: 0; padding: 0; color: inherit; background: none; font: inherit; font-weight: 700; cursor: pointer; }
      th[aria-sort="ascending"] button::after { content: " ▲"; }
      th[aria-sort="descending"] button::after { content: " ▼"; }
      .count { text-align: right; font-variant-numeric: tabular-nums; }
      [hidden] { display: none; }
    </style>
  </head>
  <body>
    <main>
      <h1>Частотная карта идентификаторов</h1>
      <p class="meta">src · ${sourceFileCount} файлов · ${identifiers.length} названий · ${totalOccurrences} вхождений · ${escapeHtml(generatedAt)}</p>
      <label>
        Фильтр по названию
        <input id="filter" type="search" autocomplete="off" placeholder="gameState, monster, tower…">
      </label>
      <p id="result-count" aria-live="polite">Показано: ${identifiers.length}</p>
      <table>
        <thead>
          <tr>
            <th scope="col" data-column="name" aria-sort="none"><button type="button" data-sort="name">Название</button></th>
            <th scope="col" class="count" data-column="count" aria-sort="descending"><button type="button" data-sort="count">Вхождения</button></th>
          </tr>
        </thead>
        <tbody>${rows}
        </tbody>
      </table>
    </main>
    <script>
      const filter = document.querySelector('#filter');
      const rows = [...document.querySelectorAll('tbody tr')];
      const tableBody = document.querySelector('tbody');
      const sortButtons = [...document.querySelectorAll('[data-sort]')];
      const sortHeaders = [...document.querySelectorAll('[data-column]')];
      const resultCount = document.querySelector('#result-count');
      const nameCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
      let sortKey = 'count';
      let sortDirection = 'descending';

      for (const button of sortButtons) {
        button.addEventListener('click', () => {
          const nextSortKey = button.dataset.sort;
          sortDirection =
            nextSortKey === sortKey
              ? sortDirection === 'ascending'
                ? 'descending'
                : 'ascending'
              : nextSortKey === 'name'
                ? 'ascending'
                : 'descending';
          sortKey = nextSortKey;

          rows.sort((left, right) => {
            const comparison =
              sortKey === 'name'
                ? nameCollator.compare(left.dataset.name, right.dataset.name)
                : Number(left.dataset.count) - Number(right.dataset.count);

            if (comparison !== 0) {
              return sortDirection === 'ascending' ? comparison : -comparison;
            }

            return nameCollator.compare(left.dataset.name, right.dataset.name);
          });
          tableBody.append(...rows);

          for (const header of sortHeaders) {
            header.setAttribute('aria-sort', header.dataset.column === sortKey ? sortDirection : 'none');
          }
        });
      }

      filter.addEventListener('input', () => {
        const query = filter.value.trim().toLocaleLowerCase('en');
        let visibleCount = 0;
        for (const row of rows) {
          const visible = row.dataset.name.includes(query);
          row.hidden = !visible;
          if (visible) visibleCount += 1;
        }
        resultCount.textContent = \`Показано: \${visibleCount}\`;
      });
    </script>
  </body>
</html>
`;
}
