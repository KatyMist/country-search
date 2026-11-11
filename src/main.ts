import type { Country } from "./mapCountryResponse.js";
import {
  createSearchController,
  type SearchState,
} from "./searchController.js";

function element<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[Tag] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

const number = new Intl.NumberFormat("en");

function formatNumber(value: number | null, unit = ""): string {
  return value === null ? "Unavailable" : `${number.format(value)}${unit}`;
}

function facts(rows: [string, string][]): HTMLDListElement {
  const list = element("dl", "facts");
  for (const [label, value] of rows) {
    const row = element("div");
    row.append(element("dt", "", label), element("dd", "", value));
    list.append(row);
  }
  return list;
}

function flag(country: Country): HTMLElement {
  const wrapper = element("span", "flag", country.flag ?? "🌐");
  wrapper.setAttribute("aria-hidden", "true");
  if (country.flagUrl) {
    const image = element("img");
    image.src = country.flagUrl;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    wrapper.append(image);
  }
  return wrapper;
}

const main = element("main", "page");
const heading = element("h1", "", "Country Search");
const label = element("label", "", "Search by country name");
label.htmlFor = "query";
const input = element("input", "search");
input.id = "query";
input.type = "search";
input.placeholder = "e.g. Spain";
input.autocomplete = "off";

const status = element("p", "status");
status.setAttribute("role", "status");
const retry = element("button", "action", "Retry");
retry.type = "button";
retry.hidden = true;
const results = element("ul", "results");
results.setAttribute("aria-label", "Matching countries");

const dialog = element("dialog", "details");
dialog.setAttribute("aria-labelledby", "country-title");
const details = element("div");
const close = element("button", "action close", "Close");
close.type = "button";
close.autofocus = true;
close.addEventListener("click", () => dialog.close());
dialog.append(close, details);

main.append(heading, label, input, status, retry, results);
document.body.append(main, dialog);

function showDetails(country: Country): void {
  const title = element("h2", "", country.name);
  title.id = "country-title";
  const description = [country.nativeName, country.subregion ?? country.region]
    .filter(Boolean)
    .join(" · ");
  details.replaceChildren(flag(country), title);
  if (description) details.append(element("p", "description", description));
  details.append(
    facts([
      ["Capital", country.capital ?? "Unavailable"],
      ["Region", country.region ?? "Unavailable"],
      ["Population", formatNumber(country.population)],
      ["Area", formatNumber(country.area, " km²")],
      ["Borders", country.borders.join(", ") || "Unavailable"],
      ["Languages", country.languages.join(", ") || "Unavailable"],
      ["Currencies", country.currencies.join(", ") || "Unavailable"],
    ]),
  );
  dialog.showModal();
}

function card(country: Country): HTMLLIElement {
  const item = element("li", "card");
  const button = element("button", "country-link", country.name);
  button.type = "button";
  button.addEventListener("click", () => showDetails(country));
  const title = element("h2");
  title.append(button);
  item.append(
    flag(country),
    title,
    facts([
      ["Capital", country.capital ?? "Unavailable"],
      ["Region", country.region ?? "Unavailable"],
      ["Population", formatNumber(country.population)],
    ]),
  );
  return item;
}

function render(state: SearchState): void {
  results.replaceChildren();
  retry.hidden = state.status !== "error";
  status.dataset.state = state.status;

  switch (state.status) {
    case "idle":
      status.textContent = "";
      break;
    case "waiting":
      status.textContent = "";
      break;
    case "loading":
      status.textContent = "Searching…";
      break;
    case "empty":
      status.textContent = "No countries found. Try a different name.";
      break;
    case "results":
      status.textContent =
        state.countries.length === 1
          ? "1 country found"
          : `${state.countries.length} countries found`;
      results.append(...state.countries.map(card));
      break;
    case "error":
      if (state.error.kind === "timeout") {
        status.textContent = "The request timed out.";
      } else if (state.error.kind === "http") {
        status.textContent = `The server returned an error (HTTP ${state.error.status}).`;
      } else {
        status.textContent = "Could not load countries.";
      }
      break;
  }
}

const search = createSearchController({ onState: render });
input.addEventListener("input", () => search.setQuery(input.value));
retry.addEventListener("click", search.retry);
