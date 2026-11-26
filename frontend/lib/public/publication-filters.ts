export type SortOrder = "newest" | "oldest";

export type PublicationFilters = {
  search: string;
  year: string;
  topics: string[];
  methods: string[];
  sort: SortOrder;
};

export type QueryParams = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

export function readFilters(params: QueryParams): PublicationFilters {
  const sort = params.get("sort");
  return {
    search: params.get("search") ?? "",
    year: params.get("year") ?? "",
    topics: params.getAll("topic"),
    methods: params.getAll("method"),
    sort: sort === "oldest" ? "oldest" : "newest",
  };
}

export function writeFilters(filters: PublicationFilters) {
  const query = new URLSearchParams();
  if (filters.search) query.set("search", filters.search);
  if (filters.year) query.set("year", filters.year);
  filters.topics.forEach((topic) => query.append("topic", topic));
  filters.methods.forEach((method) => query.append("method", method));
  if (filters.sort === "oldest") query.set("sort", filters.sort);
  return query.toString();
}

export function isActive(filters: PublicationFilters) {
  return Boolean(
    filters.search ||
    filters.year ||
    filters.topics.length ||
    filters.methods.length ||
    filters.sort === "oldest",
  );
}
