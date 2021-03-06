import { Grid } from "./radar/grid"
import { Cartesian } from "./utils/coordinate"
import { Rings } from "./radar/rings"
import { Airship } from "./airship/airship"
import { Radians } from "./utils/math"
import { Airships, AirshipPair } from "./airship/airships"
import { Polygon, PolygonPixels } from "./utils/polygon"
import { drawAirshipsVision, drawAirshipsGuidelines } from "./controls/features";

const airshipScaleRange:HTMLInputElement = document.querySelector('#airship-scale');
let airshipScale = Number(4)

airshipScaleRange.addEventListener("input", () => airshipScale = Number(4));

export class Pixel {
  private _Pixel: Pixel
  value: number

  constructor(value: number) {
    this.set(value)
  }
  
  set(value) {
    this.value = Number(value.toFixed(4))
  }

  inScale(cellSize: Pixel) {
    return this.value / cellSize.value
  }
  
  half() {
    return new Pixel(this.value / 2)
  }
}

export class PixelCoordinate {
  private _Pixel: Pixel
  x: Pixel
  y: Pixel

  constructor (x: Pixel, y: Pixel) {
    this.x = x
    this.y = y
  }

  toNumber() {
    return {
      x: this.x.value,
      y: this.y.value,
    }
  }
}

export class FlightRadarCanvas {
  canvas: HTMLCanvasElement = (<HTMLCanvasElement> document.getElementById("myCanvas"))
  ctx: CanvasRenderingContext2D

  constructor () {
    this.ctx = this.canvas.getContext('2d')
  }

  clean() {
    this.ctx.beginPath()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  drawGrid (grid: Grid) {
    this.ctx.beginPath()
    this.ctx.strokeStyle = 'black'
    this.ctx.lineWidth = 1
    
    for (let i = 0; i <= this.canvas.width; i += grid.cell.width.value) {
      this.ctx.moveTo(i, 0)
      this.ctx.lineTo(i, this.canvas.height)
    }
    
    for (let i = 0; i <= this.canvas.height; i += grid.cell.height.value) {
      this.ctx.moveTo(0, i)
      this.ctx.lineTo(this.canvas.width, i)
    }

    this.ctx.stroke()
  }

  drawGridScale (grid: Grid) {
    const scaleText = '1 km'
    const scaleMarksStyle = 'rgba(255,0,0,0.7)'
    this.ctx.beginPath()
    this.ctx.setLineDash([3, 9])
    this.ctx.fillStyle = scaleMarksStyle
    this.ctx.strokeStyle = scaleMarksStyle
    this.ctx.lineWidth = 2
    
    const xMarkerPositions = new Cartesian(4, -4.5).toPixelCoordinate(grid).toNumber()
    this.ctx.moveTo(xMarkerPositions.x, xMarkerPositions.y)
    this.ctx.lineTo(xMarkerPositions.x + grid.cell.width.value, xMarkerPositions.y)
    this.ctx.fillText(scaleText, xMarkerPositions.x + (3.5 * grid.cell.width.value / 10), xMarkerPositions.y + (2 * grid.cell.height.value / 10))

    const yMarkerPositions = new Cartesian(3.5, -4).toPixelCoordinate(grid).toNumber()
    this.ctx.moveTo(yMarkerPositions.x, yMarkerPositions.y)
    this.ctx.lineTo(yMarkerPositions.x, yMarkerPositions.y + grid.cell.height.value)
    this.ctx.fillText(scaleText, yMarkerPositions.x + (0.5 * grid.cell.width.value / 10), yMarkerPositions.y + (5.5 * grid.cell.height.value / 10))

    this.ctx.stroke()
    this.ctx.setLineDash([])
  }

  drawRings (rings: Rings) {
    this.ctx.beginPath()
    this.ctx.strokeStyle = 'black'
    this.ctx.lineWidth = rings.lineWidth

    for (let i = 0; i < rings.amount; i++) {
      this.ctx.arc(rings.center.x.value, rings.center.y.value, ((rings.radius - (rings.lineWidth / 2)) / rings.amount) * (i + 1), 0, Math.PI * 2, false)
    }

    this.ctx.stroke()
  }

  castAirshipShadow (airship: Airship, grid: Grid) {
    const pixel = airship.position.toPixelCoordinate(grid).toNumber()
    const rad = airship.direction.toRadians().value * (-1)
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.translate(pixel.x, pixel.y)
    this.ctx.translate(0, 0)
    this.ctx.rotate(rad)
    this.ctx.drawImage(airship.sprite.shadow, - airship.width.value * airshipScale / 2, - airship.height.value * airshipScale / 2, airship.width.value * airshipScale, airship.height.value * airshipScale)
    this.ctx.restore()
  }

  drawAirshipGuideLine (airship: Airship, grid: Grid) {
    if(airship.speed.value == 0) return
    
    const pixel = airship.calcNosePosition(grid).toPixelCoordinate(grid)
    const distantPointPx = airship.calcFurthestPointAhead().toPixelCoordinate(grid)
    
    this.ctx.beginPath()
    this.ctx.setLineDash([3, 9])
    this.ctx.strokeStyle = 'red'
    this.ctx.lineWidth = 1
    this.ctx.moveTo(pixel.x.value, pixel.y.value)
    this.ctx.lineTo(distantPointPx.x.value, distantPointPx.y.value)
    this.ctx.stroke()
    this.ctx.setLineDash([])
  }
  
  drawAirship (airship: Airship, grid: Grid) {
    const pixel = airship.position.toPixelCoordinate(grid).toNumber()
    const rad = airship.direction.toRadians().value * (-1)
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.font = '12px Georgia'
    this.ctx.fillStyle = 'black'
    this.ctx.fillText(airship.id, pixel.x + airship.width.value * airshipScale / 2, pixel.y - airship.height.value * airshipScale / 2)
    this.ctx.translate(pixel.x, pixel.y - airship.height.value * airshipScale * 1.5)
    this.ctx.translate(0, 0)
    this.ctx.rotate(rad)
    this.ctx.drawImage(airship.getSprite(), -airship.width.value * airshipScale / 2, -airship.height.value * airshipScale / 2, airship.width.value * airshipScale, airship.height.value * airshipScale)
    this.ctx.restore()
  }

  drawAirships (airships: Airships, grid: Grid) {
    if(drawAirshipsVision()) {
      airships.getAll().forEach(airship => {
        this.drawTriangles(airship, grid)
      })
    }
    airships.getAll().forEach(airship => {
      this.castAirshipShadow(airship, grid)
    })
    if(drawAirshipsGuidelines()) {
      airships.getAll().forEach(airship => {
        this.drawAirshipGuideLine(airship, grid)
      })
    }
    airships.getAll().forEach(airship => {
      this.drawAirship(airship, grid)
    })
  }

  drawTriangles(airship: Airship, grid: Grid) {
    const leftTriangle = airship.getLeftTrianglePolygon()
    const rightTriangle = airship.getRightTrianglePolygon()

    this.drawPolygon(leftTriangle.toPixels(grid), 'rgba(255,0,0,0.5)')
    this.drawPolygon(rightTriangle.toPixels(grid), 'rgba(0,0,255,0.5)')
  }

  //'rgba(255,0,0,0.5)'
  drawPolygon(polygon: PolygonPixels, color) {
    this.ctx.fillStyle = color
    
    this.ctx.beginPath()

    this.ctx.moveTo(polygon.points[0].x.value, polygon.points[0].y.value)
    for(let i = 1; i < polygon.points.length; i++) {
      // this.ctx.fillRect(polygon.points[i].x.value, polygon.points[i].y.value,4,4);
      this.ctx.lineTo(polygon.points[i].x.value, polygon.points[i].y.value)
    }
    this.ctx.closePath()
    this.ctx.fill()
  }
}

