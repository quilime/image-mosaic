// SVG namespace
const SVG_NS = "http://www.w3.org/2000/svg";

// maps a value from one range to another range:
const mapValue = (v, inMin, inMax, outMin, outMax) => ((v - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

// Where R, G, and B are the red, green, and blue values of the color, respectively.
// This formula is based on the perception of brightness by the human eye, which
// is more sensitive to green and less sensitive to blue.
const perceivedBrightness = (R, G, B) => 0.299 * R + 0.587 * G + 0.114 * B;

// gridsize max and min
const gridMin = 2;
const gridMax = 100;

const onReady = async () => {};
const DOMContentLoaded = () => {
  if (document.readyState !== "loading") {
    onReady();
    return;
  }
  document.addEventListener("DOMContentLoaded", onReady);
  document.addEventListener("alpine:init", async () => {

    Alpine.data("appData", () => ({
      icons: Alpine.$persist([]),
      img: new Image(),
      imageLoaded: false,
      gridSize: 20,
      progress: 0,
      showGrid: false,
      showIcons: true,
      showDownloadLink: false,
      async init() {

        // preload icons
        this.icons = await this.loadIcons();

        // event listener to image input
        const inputImage = document.getElementById("inputImage");
        inputImage.addEventListener("change", (e) => {
          this.imageLoaded = false;
          const file = e.target.files[0];
          const i = new Image();
          i.file = file;
          i.src = URL.createObjectURL(file);
          i.onload = async () => {
            this.imageLoaded = true;
            this.img = i;
          };
        });
      },
      async loadIcons() {
        // numIcons is hardcoded for now
        const numIcons = 5;
        let arr = [];
        for (var i = 1; i <= numIcons; i++) {
          const response = await fetch(`./static/icons/icon-${i}.svg`);
          const svgText = await response.text();
          const parser = new DOMParser();
          arr.push(parser.parseFromString(svgText, "image/svg+xml").documentElement);
        }
        return arr;
      },
      async generate2() {
        const totalIterations = 1000;
        let currentIteration = 0;
        const loop = () => {
          if (currentIteration < totalIterations) {
            // Your loop logic here
            currentIteration++;

            // Update progress
            this.progress = Math.floor((currentIteration / totalIterations) * 100);

            // Continue loop in the next frame
            requestAnimationFrame(loop);
          }
        }
        loop();
      },
      async generate() {

        const output = document.getElementById("output");
        output.innerHTML = "";

        const gridSize = Math.round(this.gridSize);

        const canvas = document.getElementById("canvas");
        canvas.width = this.img.width;
        canvas.height = this.img.height;

        const ctx = canvas.getContext("2d", {
          // Multiple readback operations using getImageData are faster
          // with the willReadFrequently attribute set to true
          willReadFrequently: true
        });
        ctx.drawImage(this.img, 0, 0);

        const svg = document.createElementNS(SVG_NS, "svg");

        // add gridSize to svg dimensions to account for icon clipping
        svg.setAttribute("width", this.img.width + gridSize);
        svg.setAttribute("height", this.img.height + gridSize);

        for (let y = 0; y < this.img.height; y += gridSize) {
          for (let x = 0; x < this.img.width; x += gridSize) {

            // analyze pixel in the middle of the grid size
            const dx = Math.min(this.img.width - 1, x + gridSize / 2);
            const dy = Math.min(this.img.height - 1, y + gridSize / 2);
            const pixelData = ctx.getImageData(dx, dy, 1, 1).data;

            // color and brightness data
            const color = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, ${pixelData[3] / 255})`;
            const brightness = perceivedBrightness(pixelData[0], pixelData[1], pixelData[2]);

            // rect based on color
            const rect = document.createElementNS(SVG_NS, "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width", gridSize);
            rect.setAttribute("height", gridSize);
            rect.setAttribute("fill", color);

            // show grid color
            if (this.showGrid) {
              svg.appendChild(rect);
            }

            // get icon based on brightness
            const iconId = Math.floor(mapValue(brightness, 0, 255, 1, this.icons.length - 1));
            const icon = this.icons[iconId];

            // get the viewbox of the icon
            const viewBoxStr = icon.getAttribute("viewBox");
            const vb = viewBoxStr.split(" ");

            // transform the icon, based on its viewbox size, to fit in the grid
            const group = document.createElementNS(SVG_NS, "g");
            group.setAttribute( "transform", `translate(${x},${y}), scale(${gridSize / vb[2]}, ${gridSize / vb[3]})`);

            // append all the SVG nodes from the icon file to the bew group
            for (const node of icon.childNodes) {
              if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== "script") {
                const newNode = node.cloneNode(true);
                group.appendChild(newNode);
              }
            }
            // append group, containing the icon, to the parent svg
            if (this.showIcons) {
              svg.appendChild(group);
            }
          }
        }

        // append svg to output element
        output.appendChild(svg);

        // serialize svg into string for saving
        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svg);
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8",
        });

        // Create a download link
        const link = document.getElementById("download");
        link.href = URL.createObjectURL(svgBlob);
        link.download = "generated-svg.svg";

        // show the download link
        this.showDownloadLink = true;
      }
    }));
  });
};
DOMContentLoaded();
