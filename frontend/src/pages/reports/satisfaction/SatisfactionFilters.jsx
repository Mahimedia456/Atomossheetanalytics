const emptyFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  category: "",
  rating: "",
  commentStatus: "",
};

const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const categoryOptions = ["Bug", "Feature Request", "Query", "RMA"];

const commentOptions = [
  { value: "with_comment", label: "With Comment" },
  { value: "without_comment", label: "Without Comment" },
];

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <select value={value || ""} onChange={onChange} className="input">
        <option value="">All</option>
        {options.map((item) => {
          const optionValue =
            typeof item === "object" ? String(item.value) : String(item);
          const optionLabel = typeof item === "object" ? item.label : String(item);

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <input
        type="date"
        value={value || ""}
        onChange={onChange}
        onFocus={(event) => event.target.showPicker?.()}
        onClick={(event) => event.target.showPicker?.()}
        className="input cursor-pointer appearance-none [color-scheme:dark]"
      />
    </label>
  );
}

export default function SatisfactionFilters({ filters, setFilters, options = {} }) {
  const update = (key, value) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <section className="dashboard-card p-5">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Filters
          </p>
          <h2 className="mt-1 text-xl font-black">Satisfaction Filters</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Filter by year, month, category, rating and comment status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setFilters(emptyFilters)}
          className="btn border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]"
        >
          Reset Filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block xl:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Search
          </span>

          <input
            value={filters.search || ""}
            onChange={(event) => update("search", event.target.value)}
            className="input"
            placeholder="Search ticket id, category, comment, rating..."
          />
        </label>

        <SelectField
          label="Year"
          value={filters.year}
          onChange={(event) => update("year", event.target.value)}
          options={options.years || []}
        />

        <SelectField
          label="Month"
          value={filters.month}
          onChange={(event) => update("month", event.target.value)}
          options={monthOptions}
        />

        <DateField
          label="From Date"
          value={filters.fromDate}
          onChange={(event) => update("fromDate", event.target.value)}
        />

        <DateField
          label="To Date"
          value={filters.toDate}
          onChange={(event) => update("toDate", event.target.value)}
        />

        <SelectField
          label="Category"
          value={filters.category}
          onChange={(event) => update("category", event.target.value)}
          options={categoryOptions}
        />

        <SelectField
          label="Rating"
          value={filters.rating}
          onChange={(event) => update("rating", event.target.value)}
          options={options.ratings || []}
        />

        <SelectField
          label="Comment Status"
          value={filters.commentStatus}
          onChange={(event) => update("commentStatus", event.target.value)}
          options={commentOptions}
        />
      </div>
    </section>
  );
}
