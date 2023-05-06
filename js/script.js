const onReady = async () => {};
const DOMContentLoaded = () => {
  if (document.readyState !== "loading") {
    onReady();
    return;
  }
  document.addEventListener("DOMContentLoaded", onReady);
  document.addEventListener("alpine:init", async () => {


    // const generateButton = document.getElementById("gen");
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    // const loader = document.getElementById("loader");
    const output = document.getElementById("output");
    const progressBar = document.getElementById("progress");


    // let img = new Image();
    const SVG_NS = "http://www.w3.org/2000/svg";

    // maps a value from one range to another range:
    const mapValue = (v, inMin, inMax, outMin, outMax) => ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

    // Where R, G, and B are the red, green, and blue values of the color, respectively.
    // This formula is based on the perception of brightness by the human eye, which
    // is more sensitive to green and less sensitive to blue.
    const perceivedBrightness = (R, G, B) => 0.299 * R + 0.587 * G + 0.114 * B;

    const numIcons = 5;

    Alpine.data("appData", () => ({
      imageInfo: "yuou",
      icons: Alpine.$persist([]),
      img: new Image(),
      imageLoaded: false,
      showGrid: false,
      showIcons: true,
      async init() {

        // preload icons
        this.icons = await this.loadIcons();

        // event listener to image input
        const inputImage = document.getElementById("inputImage");
        inputImage.addEventListener("change", (e) => {
          this.imageLoaded = false;
          const file = e.target.files[0];
          const i = new Image();
          i.src = URL.createObjectURL(file);
          i.onload = async () => {
            this.imageLoaded = true;
            this.img = i;
          };
        });
      },
      async loadIcons() {
        let arr = [];
        for (var i = 1; i <= numIcons; i++) {
          const response = await fetch(`./static/icons/icon-${i}.svg`);
          const svgText = await response.text();
          const parser = new DOMParser();
          arr.push(
            parser.parseFromString(svgText, "image/svg+xml").documentElement
          );
        }
        return arr;
      },
      async generate() {

        output.innerHTML = "";

        const gridSizeSlider = document.getElementById("gridSizeSlider");
        const gridSize = Math.round(gridSizeSlider.value);
        canvas.width = this.img.width;
        canvas.height = this.img.height;
        ctx.drawImage(this.img, 0, 0);

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("width", this.img.width + gridSize);
        svg.setAttribute("height", this.img.height + gridSize);

        const total = ((this.img.height / gridSize) * this.img.width) / gridSize;
        for (let y = 0; y < this.img.height; y += gridSize) {
          for (let x = 0; x < this.img.width; x += gridSize) {

            // analyze pixel in the middle of the grid size
            const dx = Math.min(this.img.width - 1, x + gridSize / 2);
            const dy = Math.min(this.img.height - 1, y + gridSize / 2);
            const pixelData = ctx.getImageData(dx, dy, 1, 1).data;

            // color and brightness data
            const color = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
            const brightness = perceivedBrightness(
              pixelData[0],
              pixelData[1],
              pixelData[2]
            );

            // rect based on color for debug
            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width", gridSize);
            rect.setAttribute("height", gridSize);
            rect.setAttribute("fill", color);
            if (this.showGrid) {
              svg.appendChild(rect); // see color of grid
            }

            // get icon based on brightness
            const iconId = Math.floor(mapValue(brightness, 0, 255, 1, this.icons.length));
            const icon = this.icons[iconId];

            // get the viewbox of the icon
            const viewBoxStr = icon.getAttribute("viewBox");
            const vb = viewBoxStr.split(" ");

            // transform the icon to fit in the grid
            const group = document.createElementNS(SVG_NS, "g");
            group.setAttribute( "transform", `translate(${x},${y}), scale(${gridSize / vb[2]}, ${gridSize / vb[3]})`);

            // append all the SVG nodes from the icon file to the group
            for (const node of icon.childNodes) {
              if (
                node.nodeType === Node.ELEMENT_NODE &&
                node.tagName !== "script"
              ) {
                const newNode = node.cloneNode(true);
                group.appendChild(newNode);
              }
            }
            // append icon (grouped) to svg
            if (this.showIcons) {
              svg.appendChild(group);
            }
          }
        }
        output.appendChild(svg);

        // serialize svg into string for saving
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });

        // Create a download link and trigger a click event
        const link = document.getElementById("download");
        link.href = URL.createObjectURL(svgBlob);
        link.download = "generated-svg.svg";
      }
    }));




    // const loadIcons = async () => {
    //   let arr = [];
    //   for (var i = 1; i <= numIcons; i++) {
    //     const response = await fetch(`./static/icons/icon-${i}.svg`);
    //     const svgText = await response.text();
    //     const parser = new DOMParser();
    //     arr.push(
    //       parser.parseFromString(svgText, "image/svg+xml").documentElement
    //     );
    //   }
    //   return arr;
    // };

    // let brightnessIcons = await loadIcons();

    // // load SVG Icon id based on perceived brightness
    // const loadSVG = async (value) => {
    //   const iconId = Math.floor(mapValue(value, 0, 255, 1, numIcons));
    //   const response = await fetch(`icons/icon-${iconId}.svg`);
    //   const svgText = await response.text();
    //   const parser = new DOMParser();
    //   const svgElement = parser.parseFromString(
    //     svgText,
    //     "image/svg+xml"
    //   ).documentElement;
    //   return svgElement;
    // };

    // const generate = async () => {
    //   output.innerHTML = "";
    //   progressBar.removeAttribute("style");

    //   // generateButton.setAttribute("disabled", "disabled");
    //   loader.setAttribute("style", "display:block");

    //   const gridSize = Math.round(gridSizeSlider.value);
    //   canvas.width = img.width;
    //   canvas.height = img.height;
    //   ctx.drawImage(img, 0, 0);

    //   const svg = document.createElementNS(SVG_NS, "svg");
    //   svg.setAttribute("width", img.width + gridSize);
    //   svg.setAttribute("height", img.height + gridSize);

    //   let progress = 0;
    //   const total = ((img.height / gridSize) * img.width) / gridSize;
    //   for (let y = 0; y < img.height; y += gridSize) {
    //     for (let x = 0; x < img.width; x += gridSize) {
    //       // update progress bar value
    //       progressBar.value = Math.min(
    //         Math.round(mapValue(progress, 0, total, 0, 100)),
    //         100
    //       );

    //       // analyze pixel in the middle of the grid size
    //       const dx = Math.min(img.width - 1, x + gridSize / 2);
    //       const dy = Math.min(img.height - 1, y + gridSize / 2);
    //       const pixelData = ctx.getImageData(dx, dy, 1, 1).data;

    //       // color and brightness data
    //       const color = `rgba(${pixelData[0]}, ${pixelData[1]}, ${
    //         pixelData[2]
    //       }, ${pixelData[3] / 255})`;
    //       const brightness = perceivedBrightness(
    //         pixelData[0],
    //         pixelData[1],
    //         pixelData[2]
    //       );

    //       // rect based on color for debug
    //       const rect = document.createElementNS(SVG_NS, "rect");
    //       rect.setAttribute("x", x);
    //       rect.setAttribute("y", y);
    //       rect.setAttribute("width", gridSize);
    //       rect.setAttribute("height", gridSize);
    //       rect.setAttribute("fill", color);
    //       // svg.appendChild(rect); // uncomment to see color of grid

    //       // get icon based on brightness
    //       const iconId = Math.floor(mapValue(brightness, 0, 255, 1, numIcons));
    //       const icon = brightnessIcons[iconId];

    //       // get the viewbox of the icon
    //       const viewBoxStr = icon.getAttribute("viewBox");
    //       const vb = viewBoxStr.split(" ");

    //       // transform the icon to fit in the grid
    //       const group = document.createElementNS(SVG_NS, "g");
    //       group.setAttribute(
    //         "transform",
    //         `translate(${x},${y}), scale(${gridSize / vb[2]}, ${
    //           gridSize / vb[3]
    //         })`
    //       );

    //       // append all the SVG nodes from the icon file to the group
    //       for (const node of icon.childNodes) {
    //         if (
    //           node.nodeType === Node.ELEMENT_NODE &&
    //           node.tagName !== "script"
    //         ) {
    //           const newNode = node.cloneNode(true);
    //           group.appendChild(newNode);
    //         }
    //       }
    //       // append icon (grouped) to svg
    //       svg.appendChild(group);

    //       progress++;
    //     }
    //   }

    //   output.innerHTML = "";
    //   output.appendChild(svg);

    //   const serializer = new XMLSerializer();
    //   const svgString = serializer.serializeToString(svg);
    //   const svgBlob = new Blob([svgString], {
    //     type: "image/svg+xml;charset=utf-8",
    //   });

    //   // Create a download link and trigger a click event
    //   // link.addC
    //   // link.href = URL.createObjectURL(svgBlob);
    //   // link.download = "generated-svg.svg";

    //   // generateButton.removeAttribute("disabled");
    //   // loader.removeAttribute("style");
    //   // progressBar.setAttribute("style", "display:none");
    // };

    // generateButton.addEventListener("click", generate);









  });
};
DOMContentLoaded();
