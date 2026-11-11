// Board Manager 2.0 posílá numThrows a názvy s mezerami; 2.1 pole throws a camelCase.
// Neměníme původní zprávy v inspektoru, pouze jejich čtení ve hře.
export function boardThrowValues(data: Record<string, unknown>): unknown[] | undefined {
  const values = Array.isArray(data.throws) ? data.throws
    : data.throws === undefined && data.numThrows === 0 ? [] : undefined;
  if (!values || values.length > 3 || (data.numThrows !== undefined && data.numThrows !== values.length)) return;
  return values;
}

export function boardStateText(data: Record<string, unknown>): string {
  return `${data.event ?? ''} ${data.status ?? ''}`.toLowerCase().replace(/[\s_-]+/g, '');
}
