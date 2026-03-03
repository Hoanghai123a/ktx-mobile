export default function clsx(...args) {
  return args
    .flatMap((a) => {
      if (!a) return [];
      if (typeof a === "string") return [a];
      if (Array.isArray(a)) return [clsx(...a)];
      if (typeof a === "object")
        return Object.entries(a)
          .filter(([, v]) => !!v)
          .map(([k]) => k);
      return [];
    })
    .filter(Boolean)
    .join(" ");
}
