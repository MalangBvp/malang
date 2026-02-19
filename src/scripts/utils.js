let C = null,
  P = null;

async function load() {
  if (C) return C;
  if (!P) {
    P = fetch("/variables/utils.json")
      .then((r) => r.json())
      .then((d) => (C = d));
  }
  return P;
}

const V = new Proxy(
  {},
  {
    get(_, k) {
      if (!C) throw "call load() first";
      return C[k];
    },
  },
);

export { load, V };
