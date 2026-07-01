import React, { Children, useMemo } from "react";
import SearchableSelect from "../SearchableSelect/SearchableSelect";

// `<Select>` is a drop-in replacement for the native `<select>`
// element. It exists so we can search every dropdown in the app
// without rewriting every form: call sites keep their existing
// `<option>` children, their `value` / `onChange` wiring, and
// their `className` — only the tag name changes.
//
// What it does under the hood:
//   - walks the `<option>` children to build an `options` array
//     (label = the option's text content, value = its `value`
//     prop; disabled options are filtered out so they can't be
//     picked but still surface the placeholder label if the
//     first child is the typical `<option value="">Select…</option>`
//     row);
//   - hands those to <SearchableSelect/>, which renders the
//     same picker UI used elsewhere (keyboard nav, search, etc.)
//     and which auto-hides its search input on short lists so
//     short enum dropdowns don't get gratuitous chrome;
//   - re-shapes the picker's value-only `onChange(value)` back
//     into a synthetic event with `target.name` / `target.value`
//     so existing handlers like `(e) => setForm({ ...form,
//     [e.target.name]: e.target.value })` keep working as-is.
//
// Notes / intentional limits:
//   - `multiple` is NOT supported (no call site uses it; if you
//     need multi-select use <MultiSelect/>);
//   - <optgroup> children are flattened — we keep the option
//     order but drop the group headers (only one place in the
//     app uses optgroups today, the field-map editor, which
//     already uses <SearchableSelect/> directly);
//   - render-prop / functional children are NOT supported; you
//     must pass plain `<option>` elements (the common case).
// Render <option> children's content to a flat string. Most
// callers pass plain text; the array branch handles mixed
// fragments like `<option>{label} {flag && "*"}</option>`.
const labelOf = (opt) => {
  const raw = opt.props.children;
  if (typeof raw === "string" || typeof raw === "number") return String(raw);
  if (Array.isArray(raw)) {
    return raw
      .map((x) => (typeof x === "string" || typeof x === "number" ? x : ""))
      .join(" ")
      .trim();
  }
  return String(opt.props.value ?? "");
};

// Walk the children once, collecting:
//   - the list of options shown in the dropdown
//   - the placeholder text (first `<option value="">…</option>`)
// Optgroups are flattened and their `label` is surfaced on the
// option's `sublabel` so the user keeps the grouping context
// (e.g. "Customer", "Sample", "Computed") in the searchable
// picker even though SearchableSelect itself renders flat.
const extractOptions = (children) => {
  let placeholder = "Select…";
  const options = [];
  let isFirst = true;

  const pushOption = (opt, group) => {
    if (!opt || opt.type !== "option") return;
    const value = opt.props.value ?? "";
    const label = labelOf(opt);

    if (isFirst && value === "" && label && !group) {
      placeholder = label;
      isFirst = false;
      return; // drop the empty placeholder row from the menu
    }
    isFirst = false;
    if (opt.props.disabled) return;
    options.push({
      value: String(value),
      label,
      sublabel: group || undefined,
    });
  };

  Children.forEach(children, (child) => {
    if (!child || typeof child !== "object") return;
    if (child.type === "optgroup") {
      const group = child.props.label || "";
      Children.forEach(child.props.children, (opt) => pushOption(opt, group));
      return;
    }
    pushOption(child);
  });

  return { options, placeholder };
};

export default function Select({
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  required, // eslint-disable-line no-unused-vars
  className = "",
  children,
  // SearchableSelect passthroughs for the rare places that want
  // to tweak placeholder / search behaviour without abandoning
  // the native-feeling shim.
  placeholder,
  alwaysShowSearch,
  searchThreshold,
  allowClear = false,
  triggerClassName = "",
  id,
  style, // eslint-disable-line no-unused-vars
  ...rest
}) {
  const { options, placeholder: extractedPlaceholder } = useMemo(
    () => extractOptions(children),
    [children]
  );

  // Controlled / uncontrolled fallback. Most call sites are
  // controlled (the parent owns `value`); for the few that pass
  // `defaultValue` we honor it on first render and leave React
  // to track changes — same as native <select>.
  const currentValue = value !== undefined ? value : defaultValue;

  // Build a synthetic event so handlers like
  //   (e) => setX(e.target.value)
  // and
  //   handleChange = (e) => setForm({...form, [e.target.name]: e.target.value})
  // keep working with zero edits in the call site.
  const handleChange = (next) => {
    if (typeof onChange !== "function") return;
    const event = {
      target: { name, value: next ?? "", type: "select-one" },
      currentTarget: { name, value: next ?? "" },
    };
    onChange(event);
  };

  return (
    <SearchableSelect
      id={id}
      name={name}
      value={currentValue === undefined || currentValue === null ? "" : String(currentValue)}
      onChange={handleChange}
      options={options}
      placeholder={placeholder || extractedPlaceholder}
      disabled={disabled}
      allowClear={allowClear}
      alwaysShowSearch={alwaysShowSearch}
      searchThreshold={searchThreshold}
      triggerClassName={`${className} ${triggerClassName}`.trim()}
      {...rest}
    />
  );
}
