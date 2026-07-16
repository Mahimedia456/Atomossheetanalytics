import {
  RotateCcw,
  Search,
} from "lucide-react";

export const initialSocialFilters = {
  search: "",
  year: "",
  month: "",
  fromDate: "",
  toDate: "",
  region: "",
  country: "",
  product: "",
  category: "",
  status: "",
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

const inputClassName =
  "input min-h-[46px] w-full [color-scheme:dark]";

function SelectField({
  label,
  value,
  onChange,
  options = [],
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <select
        value={value || ""}
        onChange={onChange}
        className={inputClassName}
      >
        <option value="">All</option>

        {options.map((item) => {
          const optionValue =
            typeof item === "object"
              ? String(item.value)
              : String(item);

          const optionLabel =
            typeof item === "object"
              ? item.label
              : String(item);

          return (
            <option
              key={optionValue}
              value={optionValue}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}) {
  function openPicker(event) {
    event.currentTarget.showPicker?.();
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <input
        type="date"
        value={value || ""}
        onChange={onChange}
        onFocus={openPicker}
        onClick={openPicker}
        min={min}
        max={max}
        className={`${inputClassName} cursor-pointer`}
      />
    </label>
  );
}

export default function SocialFilters({
  filters,
  setFilters,
  options = {},
}) {
  function update(key, value) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateFromDate(value) {
    setFilters((current) => ({
      ...current,
      fromDate: value,
      toDate:
        current.toDate &&
        value &&
        current.toDate < value
          ? ""
          : current.toDate,
    }));
  }

  function updateToDate(value) {
    setFilters((current) => ({
      ...current,
      toDate: value,
      fromDate:
        current.fromDate &&
        value &&
        current.fromDate > value
          ? ""
          : current.fromDate,
    }));
  }

  function resetFilters() {
    setFilters({
      ...initialSocialFilters,
    });
  }

  return (
    <section className="dashboard-card p-5 no-print">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Filters
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Social Filters
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Filter social records by date, region, country, product, category and status.
          </p>
        </div>

        <button
          type="button"
          onClick={resetFilters}
          className="btn inline-flex items-center gap-2 border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]"
        >
          <RotateCcw size={14} />
          Reset Filters
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block xl:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
            Search
          </span>

          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <input
              type="search"
              value={filters.search || ""}
              onChange={(event) =>
                update(
                  "search",
                  event.target.value,
                )
              }
              className={`${inputClassName} pl-11`}
              placeholder="Search customer, post/query, response, product..."
            />
          </div>
        </label>

        <SelectField
          label="Year"
          value={filters.year}
          onChange={(event) =>
            update(
              "year",
              event.target.value,
            )
          }
          options={
            options.years || []
          }
        />

        <SelectField
          label="Month"
          value={filters.month}
          onChange={(event) =>
            update(
              "month",
              event.target.value,
            )
          }
          options={monthOptions}
        />

        <DateField
          label="Date From"
          value={filters.fromDate}
          onChange={(event) =>
            updateFromDate(
              event.target.value,
            )
          }
          max={
            filters.toDate ||
            undefined
          }
        />

        <DateField
          label="Date To"
          value={filters.toDate}
          onChange={(event) =>
            updateToDate(
              event.target.value,
            )
          }
          min={
            filters.fromDate ||
            undefined
          }
        />

        <SelectField
          label="Region"
          value={filters.region}
          onChange={(event) =>
            update(
              "region",
              event.target.value,
            )
          }
          options={
            options.regions || []
          }
        />

        <SelectField
          label="Country"
          value={filters.country}
          onChange={(event) =>
            update(
              "country",
              event.target.value,
            )
          }
          options={
            options.countries || []
          }
        />

        <SelectField
          label="Product"
          value={filters.product}
          onChange={(event) =>
            update(
              "product",
              event.target.value,
            )
          }
          options={
            options.products || []
          }
        />

        <SelectField
          label="Category"
          value={filters.category}
          onChange={(event) =>
            update(
              "category",
              event.target.value,
            )
          }
          options={
            options.categories || []
          }
        />

        <SelectField
          label="Status"
          value={filters.status}
          onChange={(event) =>
            update(
              "status",
              event.target.value,
            )
          }
          options={
            options.statuses || []
          }
        />
      </div>
    </section>
  );
}