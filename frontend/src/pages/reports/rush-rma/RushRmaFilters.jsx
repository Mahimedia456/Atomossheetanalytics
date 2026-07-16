import {
  RotateCcw,
  Search,
} from "lucide-react";

export const initialRushRmaFilters = {
  search: "",
  region: "",
  month: "",
  product: "",
  dateFrom: "",
  dateTo: "",
};

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
        value={
          value || ""
        }
        onChange={
          onChange
        }
        className={
          inputClassName
        }
      >
        <option value="">
          All
        </option>

        {options.map(
          (item) => (
            <option
              key={
                String(
                  item,
                )
              }
              value={
                item
              }
            >
              {item}
            </option>
          ),
        )}
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
  function openPicker(
    event,
  ) {
    event.currentTarget
      .showPicker?.();
  }

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </span>

      <input
        type="date"
        value={
          value || ""
        }
        onChange={
          onChange
        }
        onFocus={
          openPicker
        }
        onClick={
          openPicker
        }
        min={min}
        max={max}
        className="input min-h-[46px] w-full cursor-pointer [color-scheme:dark]"
      />
    </label>
  );
}

export default function RushRmaFilters({
  filters,
  setFilters,
  options = {},
}) {
  function update(
    key,
    value,
  ) {
    setFilters(
      (
        current,
      ) => ({
        ...current,
        [key]: value,
      }),
    );
  }

  function resetFilters() {
    setFilters(
      initialRushRmaFilters,
    );
  }

  return (
    <section className="dashboard-card p-5 no-print">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00dcc5]">
            Filters
          </p>

          <h2 className="mt-1 text-xl font-black text-white">
            Rush RMA Filters
          </h2>

          <p className="mt-1 text-xs text-zinc-500">
            Filter by date
            range, region,
            month, device
            name and search.
          </p>
        </div>

        <button
          type="button"
          onClick={
            resetFilters
          }
          className="btn inline-flex items-center gap-2 border border-zinc-800 bg-black text-zinc-300 hover:border-[#00dcc5]"
        >
          <RotateCcw
            size={14}
          />

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
              value={
                filters.search ||
                ""
              }
              onChange={(
                event,
              ) =>
                update(
                  "search",
                  event.target
                    .value,
                )
              }
              className={`${inputClassName} pl-11`}
              placeholder="Search product or description..."
            />
          </div>
        </label>

        <DateField
          label="Date From"
          value={
            filters.dateFrom
          }
          onChange={(
            event,
          ) =>
            update(
              "dateFrom",
              event.target
                .value,
            )
          }
          max={
            filters.dateTo ||
            undefined
          }
        />

        <DateField
          label="Date To"
          value={
            filters.dateTo
          }
          onChange={(
            event,
          ) =>
            update(
              "dateTo",
              event.target
                .value,
            )
          }
          min={
            filters.dateFrom ||
            undefined
          }
        />

        <SelectField
          label="Region"
          value={
            filters.region
          }
          onChange={(
            event,
          ) =>
            update(
              "region",
              event.target
                .value,
            )
          }
          options={
            options.regions ||
            []
          }
        />

        <SelectField
          label="Month"
          value={
            filters.month
          }
          onChange={(
            event,
          ) =>
            update(
              "month",
              event.target
                .value,
            )
          }
          options={
            options.months ||
            []
          }
        />

        <SelectField
          label="Device Name"
          value={
            filters.product
          }
          onChange={(
            event,
          ) =>
            update(
              "product",
              event.target
                .value,
            )
          }
          options={
            options.descriptions ||
            []
          }
        />
      </div>
    </section>
  );
}