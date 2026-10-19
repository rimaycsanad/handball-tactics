// Stable short Firestore field names, including for descriptions up to 3,000 characters.
export function translationKey(text: string): string {
  let hash = 14695981039346656037n;
  for (let i = 0; i < text.length; i++)
    hash = BigInt.asUintN(
      64,
      (hash ^ BigInt(text.charCodeAt(i))) * 1099511628211n,
    );
  return `t_${text.length}_${hash.toString(16)}`;
}
