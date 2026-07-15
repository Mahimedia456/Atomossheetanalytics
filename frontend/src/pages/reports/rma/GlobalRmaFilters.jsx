import {
  RotateCcw,
  Search,
} from "lucide-react";

const filterClassName =
  "input min-h-[46px] w-full appearance-none text-sm font-semibold [color-scheme:dark]";

function SelectFilter({
  label,
  name,
  value,
  options = [],
  onChange,
  allLabel = "All",
}) {
  return (
    <label className="space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>

      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        className={filterClassName}
      >
        <option value="">
          {allLabel}
        </option>

        {options.map((option) => (
          <option
            key={`${name}-${option}`}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateFilter({
  label,
  name,
  value,
  onChange,
  min,
  max,
}) {
  function openPicker(event) {
    event.currentTarget.showPicker?.();
  }

  return (
    <label className="space-y-2">
      <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>

      <input
        name={name}
        type="date"
        value={value || ""}
        onChange={onChange}
        onFocus={openPicker}
        onClick={openPicker}
        min={min}
        max={max}
        className="input min-h-[46px] w-full cursor-pointer appearance-none text-sm font-semibold [color-scheme:dark]"
      />
    </label>
  );
}

export default function GlobalRmaFilters({
  filters,
  options = {},
  onChange,
  onReset,
}) {
  return (
    <section className="dashboard-card p-5 no-print">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#00dcc5]">
            Global RMA filters
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Search and refine records
          </h2>

          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">
            USA and EMEA Google Sheet records are merged into one report.
            Region remains available as a report filter.
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.08em] text-zinc-300 transition hover:border-[#00dcc5] hover:text-[#00dcc5]"
        >
          <RotateCcw size={14} />
          Reset filters
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2 md:col-span-2">
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-zinc-500">
            Search
          </span>

          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            />

            <input
              name="search"
              type="search"
              value={filters.search || ""}
              onChange={onChange}
              placeholder="RMA number, product, serial, customer or fault..."
              className={`${filterClassName} pl-11`}
            />
          </div>
        </label>

        <SelectFilter
          label="Region"
          name="region"
          value={filters.region}
          options={
            options.regions || []
          }
          onChange={onChange}
          allLabel="All regions"
        />

        <SelectFilter
          label="Warranty"
          name="warrantyStatus"
          value={
            filters.warrantyStatus
          }
          options={
            options.warrantyStatuses ||
            []
          }
          onChange={onChange}
          allLabel="INW and OOW"
        />

        <SelectFilter
          label="Atomos product"
          name="product"
          value={filters.product}
          options={
            options.products || []
          }
          onChange={onChange}
          allLabel="All products"
        />

        <SelectFilter
          label="RMA status"
          name="rmaStatus"
          value={filters.rmaStatus}
          options={
            options.rmaStatuses || []
          }
          onChange={onChange}
          allLabel="All statuses"
        />

        <SelectFilter
          label="Action taken"
          name="actionTaken"
          value={filters.actionTaken}
          options={
            options.actionsTaken || []
          }
          onChange={onChange}
          allLabel="All actions"
        />

        <SelectFilter
          label="Fault category"
          name="faultCategory"
          value={
            filters.faultCategory
          }
          options={
            options.faultCategories ||
            []
          }
          onChange={onChange}
          allLabel="All fault categories"
        />

        <SelectFilter
          label="Reseller / Customer"
          name="customerType"
          value={filters.customerType}
          options={
            options.customerTypes || []
          }
          onChange={onChange}
          allLabel="All customer channels"
        />

        <SelectFilter
          label="Return year"
          name="year"
          value={filters.year}
          options={
            options.years || []
          }
          onChange={onChange}
          allLabel="All years"
        />

        <SelectFilter
          label="Return month"
          name="month"
          value={filters.month}
          options={
            options.months || []
          }
          onChange={onChange}
          allLabel="All months"
        />

        <DateFilter
          label="Return date from"
          name="dateFrom"
          value={filters.dateFrom}
          onChange={onChange}
          max={
            filters.dateTo ||
            undefined
          }
        />

        <DateFilter
          label="Return date to"
          name="dateTo"
          value={filters.dateTo}
          onChange={onChange}
          min={
            filters.dateFrom ||
            undefined
          }
        />
      </div>
    </section>
  );
}