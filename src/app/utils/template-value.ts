const TEMPLATE_EXPRESSION_PATTERN = /{{\s*([^{}]{1,256})\s*}}/g;
const PATH_TOKEN_PATTERN =
  /(?:^|\.)([A-Za-z_$][\w$]*)|\[(?:(\d+)|"([^"]+)"|'([^']+)')\]/g;

export function renderTemplateExpressions(
  text: string,
  context: Record<string, unknown>
): string {
  return text.replace(TEMPLATE_EXPRESSION_PATTERN, (_match, expression) => {
    const value = resolveTemplateValue(context, expression);
    return value === undefined || value === null ? '' : String(value);
  });
}

function resolveTemplateValue(
  context: Record<string, unknown>,
  expression: string
): unknown {
  let path = expression.trim();

  if (path.startsWith('this.')) {
    path = path.slice(5);
  }

  const tokens = parsePathTokens(path);

  if (!tokens.length) {
    return undefined;
  }

  return tokens.reduce<unknown>((value, token) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    return (value as Record<string, unknown>)[token];
  }, context);
}

function parsePathTokens(path: string): string[] {
  const tokens: string[] = [];
  let consumed = '';
  let match: RegExpExecArray | null;

  PATH_TOKEN_PATTERN.lastIndex = 0;
  while ((match = PATH_TOKEN_PATTERN.exec(path))) {
    consumed += match[0];
    tokens.push(match[1] || match[2] || match[3] || match[4]);
  }

  return consumed === path ? tokens : [];
}
