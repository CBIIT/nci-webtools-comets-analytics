export function pluralCount(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : `${count} ${plural}`;
}
