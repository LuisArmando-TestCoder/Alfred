const c = qs('canvas');
const ctx = c.getContext('2d');
let speed = 2;
let letterSpacing = 20;
let count = 0, count2 = 0;

let textArray = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'Ñ', 'O',
  'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W',
  'X', 'Y', 'Z', '1', '2', '3', '4', '5',
  '6', '7', '8', '9', '0', '#', '%', '&',
  '@', '<', '>', '^', ';', '.', '|', '-',
  '_', '°', '¬', '+', '*', '/'
]

let textColors = [
  '#00FF41',
  '#008F11',
  '#003B00',
  '#0D0208'
]

let allTextColors = [
  [
    '#00FF41',
    '#008F11',
    '#003B00',
    '#0D0208'
  ],
  [
    '#00FFDF',
    '#4CFFE8',
    '#267F74',
    '#0D0208'
  ],
  [
    '#AF00FF',
    '#C74CFF',
    '#57007F',
    '#0D0208'
  ],
]

let colorIndex = 0;

wi(()=> {
  colorIndex++;
  if(colorIndex > allTextColors.length - 1) colorIndex = 0;
  textColors = allTextColors[colorIndex];
}, 10000);

let textCreatedArray = [];

function manageSize(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  window.addEventListener('resize', ()=>{
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function createText() {
  textCreatedArray.push({
    letter: textArray[r(0, textArray.length - 1)],
    x: parseInt(r(0, c.width) / letterSpacing) * letterSpacing,
    y: -20,
    color: textColors[0]
  }); // 00FF41 -> 008F11 -> 003B00 -> 0D0208
}

function drawText() {
  for (let i of textCreatedArray) {
    ctx.fillText(i.letter, i.x, i.y += speed);
    ctx.font = `${letterSpacing}px Arial`;
    count++;
    if(count === 10) {
      count = 0;
      i.color = textColors[r(0, textColors.length - 1)];
    }
    ctx.fillStyle = i.color;
    if(i.y > c.height + letterSpacing) {
      textCreatedArray.splice(textCreatedArray.indexOf(i), 1);
    }
  }
}

function drawer() {
  ctx.clearRect(0, 0, c.width, c.height);
  count2++;
  if (count2 === letterSpacing / 2) {
    count2 = 0;
    for(let i = 0; i < parseInt(c.width /  70 * 2); i++) {
      createText();
    }
  }
  drawText();
  window.requestAnimationFrame(drawer);
}

manageSize(c);
drawer();