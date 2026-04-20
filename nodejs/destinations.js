
window.TRIPWISE_DESTINATIONS = [
  {
    id: "kyoto-jp",
    name: "Kyoto, Japan",
    country: "Japan",
    tags: ["culture", "temples", "etiquette"],
    image: "../images/kyoto.png",
    images: ["../images/kyoto1.png", "../images/kyoto2.png", "../images/kyoto3.png"],
    visible: false
  },
  {
    id: "tokyo-jp",
    name: "Tokyo, Japan",
    country: "Japan",
    tags: ["city", "food", "transport"],
    image: "../images/tokyo.png",
    images: ["../images/tokyo1.png", "../images/tokyo2.png", "../images/tokyo3.png"],
    visible: true
  },
  {
    id: "paris-fr",
    name: "Paris, France",
    country: "France",
    tags: ["city", "museums", "romance"],
    image: "../images/paris.png",
    images: ["../images/paris1.png", "../images/paris2.png", "../images/paris3.png"],
    visible: true
  },
  {
    id: "rome-it",
    name: "Rome, Italy",
    country: "Italy",
    tags: ["history", "museums", "religion"],
    image: "../images/rome.png",
    images: ["../images/rome1.png", "../images/rome2.png", "../images/rome3.png"],
    visible: false
  },
  {
    id: "barcelona-es",
    name: "Barcelona, Spain",
    country: "Spain",
    tags: ["beach", "architecture", "food"],
    image: "../images/barcelona.png",
    images: ["../images/barcelona1.png", "../images/barcelona2.png", "../images/barcelona3.png"],
    visible: false
  },
  {
    id: "newyork-us",
    name: "New York, USA",
    country: "USA",
    tags: ["city", "shopping", "nightlife"],
    image: "../images/newyork.png",
    images: ["../images/newyork1.png", "../images/newyork2.png", "../images/newyork3.png"],
    visible: true
  },
  {
    id: "marrakech-ma",
    name: "Marrakech, Morocco",
    country: "Morocco",
    tags: ["markets", "culture", "customs"],
    image: "../images/marrakech.png",
    images: ["../images/marrakech1.png", "../images/marrakech2.png", "../images/marrakech3.png"],
    visible: true
  },
  {
    id: "bangkok-th",
    name: "Bangkok, Thailand",
    country: "Thailand",
    tags: ["temples", "streetfood", "nightmarkets"],
    image: "../images/bangkok.png",
    images: ["../images/bangkok1.png", "../images/bangkok2.png", "../images/bangkok3.png"],
    visible: true
  },
  {
    id: "reykjavik-is",
    name: "Reykjavik, Iceland",
    country: "Iceland",
    tags: ["nature", "northernlights", "safety"],
    image: "../images/reykjavik.png",
    images: ["../images/reykjavik1.png", "../images/reykjavik2.png", "../images/reykjavik3.png"],
    visible: true
  },
  {
    id: "siemreap-kh",
    name: "Siem Reap, Cambodia",
    country: "Cambodia",
    tags: ["temples", "history", "respect"],
    image: "../images/siemreap.png",
    images: ["../images/siemreap1.png", "../images/siemreap2.png", "../images/siemreap3.png"],
    visible: true
  }
];


window.populateDestinationSelect = function (selectId, includeAny = false) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  sel.innerHTML = "";

  if (includeAny) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Any destination";
    sel.appendChild(opt);
  }

  (window.TRIPWISE_DESTINATIONS || [])
    .filter((d) => d.visible !== false)
    .forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.textContent = d.name;
      sel.appendChild(opt);
    });
};

window.getDestinationById = function (id) {
  return (window.TRIPWISE_DESTINATIONS || []).find((d) => d.id === id) || null;
};
