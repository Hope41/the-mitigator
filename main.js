'use strict'
class Camera {
    constructor(x, y) {
        this.x = x
        this.y = y
        this.zoom = 50
        this.shake = 100
        this.shift = 0
    }

    update() {
        this.x += (hero.x - this.x) / 3
        this.y += (hero.y - this.y) / 10

        if (this.shake) {
            this.shake --
            this.x += random(-this.shift / 2, this.shift, 0) * this.zoom
            this.y += random(-this.shift / 2, this.shift, 0) * this.zoom
        }

        const normal_zoom = 6
        const zoom_point = cvs.height * .9
        const left_zoom = -map.array[~~this.x + 1] * scale - this.offset_y
        const right_zoom = -map.array[~~(this.x + hero.width) - 1] * scale - this.offset_y
        const largest_zoom = left_zoom > right_zoom ? left_zoom : right_zoom
        
        if (largest_zoom > zoom_point) this.zoom += (largest_zoom - zoom_point) / 400
        else this.zoom -= (this.zoom - normal_zoom) / 100
    }

    get offset_x() {return this.x * scale - cvs.width / 2}
    get offset_y() {return this.y * scale - cvs.height / 2}
}

class World {
    constructor() {
        this.set()

        this.level = 0
        this.level_end = 10
        this.width = this.level_end
        this.change_level = false
        this.plants_on_screen = 0
    }

    set() {
        this.array = []
        this.enemies = []
        this.clones = []
        this.junk = []
        this.used_power = []
        this.plants = []
        this.plant_screen = []

        this.junk_timer_start = 3
        this.junk_timer = this.junk_timer_start
    }

    changeLevel() {
        screen.fade.type = 'out'

        const change = screen.fadeOut()

        if (change) {
            this.level ++

            this.set()

            this.width += 10
            map.generate()
            hero.reset()

            screen.sun.g += 50

            if (screen.sun.g > 255) screen.sun.b += 50

            screen.sky.g += 20
            screen.sky.b += 50

            screen.mist.r -= 50
            screen.mist.g -= 50
            screen.mist.a -= 20

            this.change_level = false
        }
    }

    generate() {
        const enemy_amount = ~~(this.level_end - this.level * 3)
        let make_enemies = enemy_amount

        const append_junk = x => {
            this.junk.push(
                new Junk(
                    x + random(.1, .9, 0),
                    -this.array[x]
                )
            )
        }

        for (let i = 0; i < this.width; i ++) {
            this.array[i] = 5 + random(
                Math.abs(Math.sin(i / 2 ^ 9) * 3),
                Math.abs(Math.sin(i / 9 ^ 9) * 5), 0
            )

            this.junk_timer --

            if (this.junk_timer <= 0) {
                for (let n = 0; n < this.junk_timer_start + 2; n ++) append_junk(i)
                
                this.junk_timer_start = random(1, 5)
                this.junk_timer = this.junk_timer_start
            }

            make_enemies --

            if (i > 8) {
                if (make_enemies <= 0) {
                    if (this.level == this.level_end - 1) {
                        this.enemies.push(
                            new Enemy(i, -this.array[i] - .35, .35, .35)
                        )
                        this.enemies.push(
                            new Enemy(i + .5, -this.array[i] - .35, .35, .35)
                        )
                    }
                    else
                        this.enemies.push(
                            new Enemy(i, -this.array[i] - .35, .35, .35)
                        )
                    make_enemies = enemy_amount
                }
            }
        }
    }

    checkIfAllEnemiesAreDead() {
        let all_dead = true

        this.enemies.forEach(item => {
            if (item.health >= 0) all_dead = false
        })

        if (all_dead) this.change_level = true
    }

    plantsOnScreen() {
        const max_plants_on_screen = 40

        this.plant_screen = []

        this.plants.forEach(item => {
            this.plant_screen.push(item)
        })

        if (this.plant_screen.length >= max_plants_on_screen)
            for (let i = 0; i < this.plant_screen.length - max_plants_on_screen; i ++)
                this.plants[this.plants.indexOf(this.plant_screen[i])].die = true
    }

    update() {
        cam.update()
        hero.update()

        this.junk.forEach(item => {
            item.update()
        })

        this.enemies.forEach(item => {
            item.update()
        })

        this.clones.forEach(item => {
            item.update()
        })

        this.used_power.forEach(item => {
            item.update()
        })

        const colorGround = distance => {
            const light = .5 + Math.abs(distance) / 10

            return ctx.fillStyle = rgb(20 / light + 30, 20 / light, 20 / light)
        }

        // ground
        this.array.forEach((item, index) => {
            colorGround(hero.x - index - .5)
            stretchRect(
                0, 0, 1.02, cvs.height, {x: index, y: -item, width: 1, height: 1}
            )
        })

        // walls
        colorGround(hero.x)
        ctx.fillRect(
            -scale, 0, -cam.offset_x + scale, cvs.height,
        )
        colorGround(hero.x + hero.width - this.width)
        ctx.fillRect(
            this.width * scale - cam.offset_x, 0,
            cvs.width - cam.offset_x / scale + 1, cvs.height
        )

        this.plants.forEach(item => {
            item.update()
        })

        if (this.change_level) this.changeLevel()
        else screen.fade.type = 'in'

        if (hero.health <= 0) screen.fade.type = 'over'
        if (this.level >= this.level_end) screen.fade.type = 'win'
    }
}

class Base {
    screen() {
        /* apply the scale & camera offset
        to the base object's positions to
        find it's position on the screen.
        returns true if its on the screen */

        const x = this.x * scale - cam.offset.x
        const y = this.y * scale - cam.offset.y
        const width = this.width * scale
        const height = this.height * scale

        return (
            x + width > 0 && x < cvs.width &&
            y + height > 0 && y < cvs.width)
    }

    onScreen() {
        /* Returns true if the input object
        is on the screen */

        const x = this.x * scale - cam.offset_x
        const y = this.y * scale - cam.offset_y
        const width = this.width * scale
        const height = this.height * scale

        return (
            x < cvs.width &&
            x + width > 0 &&
            y < cvs.height &&
            y + height > 0
        )
    }
}

class Robot extends Base {
    constructor(x, y, width, height) {
        super()

        this.x = x
        this.y = y
        this.width = width
        this.height = height

        this.land_on_side = false
        this.speed_y = 0

        this.in_air = true
        this.blink = {
            time: 0,
            active: false,
            value: 0
        }
        this.dir = {
            face: 1,
            move: 0
        }
    }

    death(color) {
        this.dir.move = 0
        this.collideGround()
        this.drawDie(0, 0, color)
    }

    jump(force) {
        this.speed_y = -force
        this.in_air = true
    }

    body(main_color, face_color) {
        ctx.fillStyle = main_color
        stretchRect(0, 0, 1, .4, this) // head
        stretchRect(.44, .4, .12, .2, this) // neck
        stretchRect(0, .5, 1, .5, this) // body

        ctx.fillStyle = face_color
        stretchRect(.1, .1, .8, .2, this) // face
    }

    arm(x, y, color) {
        const arm_size = .1
        ctx.fillStyle = color
        stretchRect(x + .5 - arm_size / 2, y, arm_size, arm_size, this)
    }

    eye(x, y, color, eyelid_color) {
        const eye_size = .12

        ctx.fillStyle = color
        stretchRect(x + .5 - eye_size / 2, y, eye_size, eye_size, this)

        this.blink.time --

        if (this.blink.time < 0) this.blink.active = true

        if (this.blink.active) {
            this.blink.value += .1
            const pad = .01

            if (this.blink.value > Math.PI) {
                this.blink.value = 0
                this.blink.time = random(0, 500)
                this.blink.active = false
            }

            ctx.fillStyle = eyelid_color
            stretchRect(
                (x + .5 - eye_size / 2) - pad,
                (y + eye_size) + pad,
                eye_size + pad * 2,
                (-Math.sin(this.blink.value) * eye_size) - pad * 2, this
            )
        }
    }

    drawDie(x, y, color) {
        ctx.fillStyle = color
        stretchRect(x, y + .5, 1, .5, this)
    }

    collideGround() {
        const arr = [{
            x: Math.floor(this.x + this.width),
            y: -map.array[Math.floor(this.x + this.width)],
            width: 1, height: map.array[Math.floor(this.x + this.width)]
        },{
            x: Math.floor(this.x),
            y: -map.array[Math.floor(this.x)],
            width: 1, height: map.array[Math.floor(this.x)]
        }]

        let collision = false

        arr.forEach(obj => {
            if (collide(this, obj)) {
                const overlap = merge(this, obj)
                collision = true

                if (overlap.x) {
                    this.x -= overlap.x
                    this.land_on_side = true
                }
                else {
                    this.y -= overlap.y
                    this.speed_y = 0
                    this.in_air = false
                }
            }
        })

        if (!collision) this.land_on_side = false

        if (this.x < 0) this.x -= this.x
        if (this.x + this.width > map.width)
            this.x += map.width - (this.x + this.width)
    }
    
    update() {
        this.y += this.speed_y
        this.speed_y += gravity

        this.x += this.dir.move * this.speed
        if (this.x <= 0) {
            this.dir.move = 1
            this.dir.face = 1
        }
        if (this.x >= map.width - this.width) {
            this.dir.move = -1
            this.dir.face = -1
        }

        if (this.speed_y > .5) this.speed_y = .5
    }
}

class Player extends Robot {
    constructor(width, height) {
        super(0, 0, width, height)

        this.speed = .05
        this.max_power = 20
        this.upgrades = ['seed', 'seed bomb', 'cloner']

        this.reset()
    }

    reset() {
        if (map.level < map.level_end)
            this.upgrade = this.upgrades[
                Math.ceil((map.level + 1) / (map.level_end / this.upgrades.length)) - 1
            ]
        else this.upgrade = ''

        this.hit = false
        this.recover_time = 0
        this.health = 5
        this.power = 0

        this.x = .35
        this.y = -10
    }

    recover() {
        Math.floor(this.recover_time / 10) % 2 ? this.draw() : 0
    }

    throw() {
        if (this.upgrade == 'seed') {
            map.used_power.push(
                new Seed({
                    x: this.x + this.width / 2,
                    y: this.y + this.height / 2,
                    width: .1,
                    height: .1,
                    speed_x: .1 * this.dir.face + random(-.01, .01, 0),
                    speed_y: -.05,
                    life_time: 100,

                    plant: {
                        color: [0],
                        min_growth: 1,
                        max_growth: 5,
                        stem_limit_min: 5,
                        stem_limit_max: 10,
                    }
                })
            )
        }
        if (this.upgrade == 'seed bomb') {
            map.used_power.push(
                new SeedBomb({
                    x: this.x + this.width / 2,
                    y: this.y + this.height / 2,
                    width: .1,
                    height: .1,
                    speed_x: .1 * this.dir.face + random(-.01, .01, 0),
                    speed_y: -.05,
                    life_time: 200,

                    plant: {
                        color: [0],
                        min_growth: 1,
                        max_growth: 5,
                        stem_limit_min: 5,
                        stem_limit_max: 10
                    }
                })
            )
        }
        if (this.upgrade == 'cloner') {
            map.used_power.push(
                new Cloner({
                    x: this.x + this.width / 2,
                    y: this.y + this.height / 2,
                    width: .1,
                    height: .1,
                    speed_x: .1 * this.dir.face + random(-.01, .01, 0),
                    speed_y: -.05,
                    life_time: 100
                })
            )
        }

        this.power --
    }

    update() {
        super.update()

        if (!this.health) {
            this.death('#666')
            return
        }

        if (key.arrowleft || key.a || key.q) {
            this.dir.move = -1
            this.dir.face = -1
        }
        if (key.arrowright || key.d) {
            this.dir.move = 1
            this.dir.face = 1
        }

        /* if you're not pressing left orright
        OR you're pressing both left and right,
        stop moving the player */

        if ((
                !key.arrowleft && // left
                !key.arrowright && // right
                !key.a && // left
                !key.q && // left
                !key.d // right
            ) || (
                (key.arrowleft || // left
                key.a || // left
                key.q // left
                ) && (
                key.arrowright || // right
                key.d // right
                )
            )
        ) this.dir.move = 0

        this.collideGround()

        if (key.arrowup || key.w || key.z)
            if (!this.in_air || this.speed_y >= 0 && this.land_on_side)
                this.jump(.12)
        
        if (this.hit) {
            screen.numbers.push(new Number({
                x: this.x + this.width / 2,
                y: this.y,
                speed_x: 0,
                speed_y: -4,
                text: 'X',
                color: [0, 0, 0, 255],
                fade_speed: 4
            }))

            hero.health --

            if (this.health <= 0) this.jump(.12)

            cam.shake = 30
            cam.shift = .01
            this.recover_time = 50

            this.hit = false
        }

        if (this.recover_time) {
            this.recover_time --
            hero.recover()
        }
        else this.draw()
    }

    draw() {
        const eye = '#221'
        const face = '#888'
        const arm = '#444'
        const main = '#666'
        const eye_y = .15

        this.body(main, face)
        this.arm(-.5, .6, arm)
        this.arm(.5, .6, arm)

        if (!this.dir.move) {
            this.eye(-.1, eye_y, eye, face)
            this.eye(.1, eye_y, eye, face)
        }
        else {
            if (this.dir.move == -1) {
                this.eye(-.2, eye_y, eye, face)
                this.eye(0, eye_y, eye, face)
            }
            if (this.dir.move == 1) {
                this.eye(0, eye_y, eye, face)
                this.eye(.2, eye_y, eye, face)
            }
        }
    }
}

class Enemy extends Robot {
    constructor (x, y, width, height) {
        super(x, y, width, height)

        this.seed_health_loss = .15
        this.plant_health_loss = .003
        this.full_bonus = 5

        this.health = 1
        this.bonus = 0
        this.move_time = 100
        this.speed = .03
        this.clone_timer = 0
    }

    kill() {
        this.death('#433')

        const jump_time = 10000

        if (this.health > -jump_time) {
            this.jump(.12)
            this.health -= jump_time * 2
            if (this.bonus <= 0) this.bonus = 0

            map.checkIfAllEnemiesAreDead()
            for (let i = 0; i < random(2, 5); i ++) {
                const x = random(0, this.width, 0)
                map.plants.push(
                    new Plant({
                        x: this.x + x,
                        y: -map.array[Math.floor(this.x + x)],
                        color: [random(100, 255), random(0, 20), random(0, 20), 255],
                        min_growth: 1,
                        max_growth: 2,
                        stem_limit_min: 2,
                        stem_limit_max: 5
                    })
                )
            }

            screen.numbers.push(new Number({
                x: this.x,
                y: this.y,
                speed_x: 0,
                speed_y: -2,
                text: '+2',
                color: [0, 255, 0, 255],
                fade_speed: 2
            }))

            if (Math.ceil(this.bonus) >= this.full_bonus) {
                screen.numbers.push(new Number({
                    x: cvs.width / 2,
                    y: cvs.height / 2,
                    speed_x: 0,
                    speed_y: -1,
                    text: '+' + this.full_bonus + '! You destroyed a robot entirely using plants!',
                    color: [0, 255, 200, 255],
                    fade_speed: 1
                }, false))

                hero.power += this.full_bonus
            }
            else {
                if (this.bonus) {
                    screen.numbers.push(new Number({
                        x: cvs.width / 2,
                        y: cvs.height / 2,
                        speed_x: 0,
                        speed_y: -1,
                        text: 'PLANT BONUS: ' + Math.ceil(this.bonus),
                        color: [0, 255, 200, 255],
                        fade_speed: 2
                    }, false))
                }

                hero.power += this.bonus
            }

            hero.power += 2
        }
    }

    update() {
        if (!this.onScreen()) return

        super.update()

        if (this.health <= 0) {
            this.kill()

            return
        }

        // control
        if (!this.land_on_side) {
            this.move_time --
            if (this.move_time < 0) {
                const dir = random(1, 3)

                if (this.dir.move) this.dir.move = 0

                else {
                    if (dir == 1) {
                        this.dir.move = -1
                        this.dir.face = -1
                    }
                    else if (dir == 2) {
                        this.dir.move = 1
                        this.dir.face = 1
                    }
                }

                this.move_time = random(100, 200)
            }
        }

        this.collideGround()
        if (collide(this, hero) && !hero.recover_time) hero.hit = true

        map.used_power.forEach(item => {
            if (collide(this, item)) {
                if (this.health > 0) this.health -= this.seed_health_loss

                cam.shake = 10
                cam.shift = .005

                map.used_power.splice(map.used_power.indexOf(item), 1)
            }
        })
        map.plant_screen.forEach(item => {
            if (collide(this, item)) {
                this.health -= this.plant_health_loss
                this.bonus += this.full_bonus * this.plant_health_loss

                cam.shake = 10
                cam.shift = .001
            }
        })

        if (this.land_on_side && this.speed_y >= 0) this.jump(.08)

        if (!map.junk.length && hero.power < 1) {
            map.junk.push(
                new Junk(
                    this.x, this.y
                )
            )
        }

        this.draw()
    }

    draw() {
        const face = '#966'
        const eye = '#f00'
        const arm = '#322'
        const main = '#433'
        const eye_y = .15

        this.body(main, face)
        this.arm(-.5, .6, arm)
        this.arm(.5, .6, arm)

        if (!this.dir.move) {
            this.eye(-.2, eye_y, eye, face)
            this.eye(.2, eye_y, eye, face)
        }
        else {
            if (this.dir.move == -1) {
                this.eye(-.3, eye_y, eye, face)
                this.eye(.1, eye_y, eye, face)
            }
            if (this.dir.move == 1) {
                this.eye(-.1, eye_y, eye, face)
                this.eye(.3, eye_y, eye, face)
            }
        }

        ctx.fillStyle = '#000'
        stretchRect(0, -.3, this.health, .05, this)
    }
}

class Clone extends Robot {
    constructor (x, y, width, height) {
        super(x, y, width, height)

        this.move_time = 0
        this.speed = .015
        this.y -= this.height
        this.speed_y = -random(.05, .1, 0)

        this.dead = false
        this.drop_seed_timer = 100
    }

    update() {
        if (!this.onScreen()) return
        super.update()

        // control
        if (!this.land_on_side) {
            this.move_time --
            if (this.move_time < 0) {
                const dir = random(1, 3)

                if (this.dir.move) this.dir.move = 0

                else {
                    if (dir == 1) {
                        this.dir.move = -1
                        this.dir.face = -1
                    }
                    else if (dir == 2) {
                        this.dir.move = 1
                        this.dir.face = 1
                    }
                }

                this.move_time = random(100, 200)
            }
        }

        this.collideGround()
        if (this.land_on_side && this.speed_y >= 0) this.jump(.12)

        this.drop_seed_timer --

        if (this.drop_seed_timer <= 0 && this.dir.move) {
            map.used_power.push(
                new Seed({
                    x: this.x + this.width / 2,
                    y: this.y + this.height / 2,
                    width: .05,
                    height: .05,
                    speed_x: .05 * this.dir.face,
                    speed_y: -.03,
                    life_time: 60,

                    plant: {
                        color: [0, random(0, 255), 0, 255],
                        min_growth: 1,
                        max_growth: 3,
                        stem_limit_min: 5,
                        stem_limit_max: 10
                    }
                })
            )

            this.drop_seed_timer = 100
        }

        this.draw()
    }

    draw() {
        const face = '#696'
        const eye = '#000'
        const arm = '#232'
        const main = '#343'
        const eye_y = .15

        this.body(main, face)
        this.arm(-.5, .6, arm)
        this.arm(.5, .6, arm)

        if (!this.dir.move) {
            this.eye(-.1, eye_y, eye, face)
            this.eye(.1, eye_y, eye, face)
        }
        else {
            if (this.dir.move == -1) {
                this.eye(-.2, eye_y, eye, face)
                this.eye(0, eye_y, eye, face)
            }
            if (this.dir.move == 1) {
                this.eye(0, eye_y, eye, face)
                this.eye(.2, eye_y, eye, face)
            }
        }
    }
}

class Junk extends Base {
    constructor (x, y) {
        super()

        this.x = x
        this.y = y

        this.speed_y = 0
        this.time = random(0, 100, 0)

        const type = random(0, 150)
        if (type <= 50) this.type = 'bottle'
        else if (type <= 70) this.type = 'machine'
        else if (type <= 100) this.type = 'packet'
        else if (type <= 150) this.type = 'box'

        const angle = random(0, 100)
        let set_angle = ''
        if (angle <= 30) set_angle = 'left'
        else if (angle <= 70) set_angle = 'up'
        else if (angle <= 100) set_angle = 'right'

        if (this.type == 'bottle') {
            this.width = .1
            this.height = .2

            this.angle =
                set_angle == 'left' ? random(-80, -70, 0)
                : set_angle == 'up' ? random(-10, 10, 0)
                : set_angle == 'right' ? random(70, 80, 0) : 0
        }
        else if (this.type == 'machine') {
            this.width = .3
            this.height = .3

            this.angle = random(-5, 5, 0)
        }
        else if (this.type == 'packet') {
            this.width = .12
            this.height = .15

            this.angle =
                set_angle == 'left' ? random(-80, -70, 0)
                : set_angle == 'up' ? random(-20, 20, 0)
                : set_angle == 'right' ? random(70, 80, 0) : 0
        }
        else if (this.type == 'box') {
            this.width = .25
            this.height = .25

            this.angle = random(-2, 2)
        }

        this.y = -map.array[Math.floor(this.x)] - this.height
    }

    update() {
        if (!this.onScreen()) return

        this.y += this.speed_y
        this.speed_y += gravity

        const arr = [{
            x: Math.floor(this.x + this.width),
            y: -map.array[Math.floor(this.x + this.width)],
            width: 1, height: map.array[Math.floor(this.x + this.width)]
        },{
            x: Math.floor(this.x),
            y: -map.array[Math.floor(this.x)],
            width: 1, height: map.array[Math.floor(this.x)]
        }]

        arr.forEach(obj => {
            if (collide(this, obj)) {
                const overlap = merge(this, obj)

                if (overlap.x) this.x -= overlap.x
                else {
                    this.y -= overlap.y
                    this.speed_y = 0
                    this.in_air = false
                }
            }
        })

        if (collide(hero, this)) {
            map.junk.splice(map.junk.indexOf(this), 1)

            screen.numbers.push(new Number({
                x: this.x,
                y: this.y,
                speed_x: 0,
                speed_y: -5,
                text: '+1',
                color: [0],
                fade_speed: 10
            }))

            hero.power += 1
        }

        this.draw()
    }

    draw() {
        this.time += .1
        if (this.type == 'bottle') {
            const anchor_x = .5
            const anchor_y = 1

            ctx.save()
                translate(anchor_x, anchor_y, this)
                rotate(this.angle)

                // main bottle
                ctx.fillStyle = '#7309'
                scaleRect(.25, 0, .5, 1, this, anchor_x, anchor_y)
                scaleRect(0, .4, 1, .6, this, anchor_x, anchor_y)
                // reflection
                ctx.fillStyle = '#fff5'
                scaleRect(.3, .4, .1, .6, this, anchor_x, anchor_y)
                scaleRect(.4, 0, .07, .4, this, anchor_x, anchor_y)
                // lid
                ctx.fillStyle = '#4009'
                scaleRect(.2, 0, .6, .05, this, anchor_x, anchor_y)
                scaleRect(.2, .09, .6, .05, this, anchor_x, anchor_y)
                ctx.fillStyle = '#9729'
                scaleRect(.25, -.03, .5, .05, this, anchor_x, anchor_y)
            ctx.restore()
        }
        else if (this.type == 'machine') {
            const anchor_x = .5
            const anchor_y = .5

            ctx.save()
                translate(
                    anchor_x + random(-.02, .02, 0),
                    anchor_y + random(-.04, .04, 0), this
                )
                rotate(this.angle)
                // main washing machine
                // const offset_x = 
                // const offset_y = 

                ctx.fillStyle = '#a98'
                scaleRect(
                    0, 0, 1, 1, this,
                    anchor_x, anchor_y
                )
                // lights
                for (let i = 0; i < 5; i ++) {
                    if (~~this.time % (i + 2) == 0) {
                        ctx.fillStyle = rgb(
                            random(0, 255),
                            random(0, 50),
                            random(0, 100)
                        )
                        scaleRect(
                            .05 + i * .2, .05, .05, .1, this,
                            anchor_x, anchor_y
                        )
                    }
                }
                // spinning bit
                ctx.fillStyle = '#111b'
                scaleCir(
                    .5 + random(-.01, .01, 0),
                    .5 + random(-.01, .01, 0),
                    .35, this, anchor_x, anchor_y
                )
                // reflection
                ctx.fillStyle = '#fff5'
                scaleRect(
                    .475 + Math.sin(this.time * 2) * .25,
                    .475 + Math.cos(this.time * 2) * .25,
                    .05, .05, this, anchor_x, anchor_y
                )
            ctx.restore()
        }
        else if (this.type == 'packet') {
            const anchor_x = .5
            const anchor_y = 1

            ctx.save()
                translate(anchor_x, anchor_y, this)
                rotate(this.angle)
                // main packaging
                ctx.fillStyle = '#811'
                scaleRect(0, 0, 1, 1, this, anchor_x, anchor_y)
                // The 'M'
                ctx.fillStyle = '#990'
                scaleRect(.2, .2, .1, .6, this, anchor_x, anchor_y)
                scaleRect(.3, .3, .1, .2, this, anchor_x, anchor_y)
                scaleRect(.4, .4, .1, .2, this, anchor_x, anchor_y)
                scaleRect(.5, .3, .1, .2, this, anchor_x, anchor_y)
                scaleRect(.6, .2, .1, .6, this, anchor_x, anchor_y)
                // red top
                ctx.fillStyle = '#a98'
                scaleRect(-.05, 0, 1.1, .1, this, anchor_x, anchor_y)
                // lower text
                ctx.fillStyle = '#4446'
                scaleRect(.45, .9, .5, .05, this, anchor_x, anchor_y)
            ctx.restore()

        }
        else if (this.type == 'box') {
            const anchor_x = .5
            const anchor_y = .5

            ctx.save()
                translate(anchor_x, anchor_y, this)
                rotate(this.angle)
                // main box bit
                ctx.fillStyle = '#752'
                scaleRect(
                    0, 0, 1, 1, this,
                    anchor_x, anchor_y
                )
                // side
                ctx.fillStyle = '#0003'
                scaleRect(
                    .9, 0, .1, 1, this,
                    anchor_x, anchor_y
                )
                // tape
                ctx.fillStyle = '#0002'
                scaleRect(
                    0, .4, 1, .2, this,
                    anchor_x, anchor_y
                )
                scaleRect(
                    .6, 0, .2, .1, this,
                    anchor_x, anchor_y
                )
                // text
                ctx.fillStyle = '#0003'
                scaleRect(
                    .05, .05, .2, .05, this,
                    anchor_x, anchor_y
                )
                scaleRect(
                    .05, .11, .12, .05, this,
                    anchor_x, anchor_y
                )
                scaleRect(
                    .05, .17, .21, .05, this,
                    anchor_x, anchor_y
                )
                ctx.fillStyle = '#b009'
                scaleRect(
                    .05, .23, .23, .05, this,
                    anchor_x, anchor_y
                )
            ctx.restore()
        }

        for (let i = 0; i < 5; i ++) {
            ctx.fillStyle = '#0002'
            stretchRect(
                (i % 1.2) - .2, 1, .5,
                -.1 + Math.sin(
                    (this.time / 2 + (i ^ 9))
                ) / 20, this
            )
        }
    }
}

class Upgrade extends Base {
    constructor(d) {
        super()
        this.x = d.x
        this.y = d.y
        this.width = d.width
        this.height = d.height

        this.speed_x = d.speed_x
        this.speed_y = d.speed_y
        this.life_time = d.life_time

        this.in_air = true
    }
    update() {
        this.life_time --
        // collision
        let collision = false
        const arr = [{
            x: Math.floor(this.x + this.width),
            y: -map.array[Math.floor(this.x + this.width)],
            width: 1, height: map.array[Math.floor(this.x + this.width)]
        },{
            x: Math.floor(this.x),
            y: -map.array[Math.floor(this.x)],
            width: 1, height: map.array[Math.floor(this.x)]
        }]
        arr.forEach(obj => {
            if (collide(this, obj)) {
                collision = true
                const overlap = merge(this, obj)

                if (overlap.x) {
                    this.speed_x -= overlap.x

                    this.speed_x *= .6
                }
                else {
                    this.in_air = false
                    this.speed_y -= overlap.y

                    this.speed_x *= .9
                    this.speed_y *= .85
                }
            }
        })
        if (!collision) this.in_air = true

        if (this.x < 0) {
            this.speed_x -= this.x
            if (this.y > -map.array[0]) {
                this.y = -map.array[0] - this.height
                this.speed_y = 0
            }
        }
        if (this.x + this.width > map.width) {
            this.speed_x += map.width - (this.x + this.width)
            if (this.y > -map.array[map.width - 1]) {
                this.y = -map.array[map.width - 1] - this.height
                this.speed_y = 0
            }
        }

        this.y += this.speed_y
        this.speed_y += gravity
        this.x += this.speed_x
        this.speed_x *= .97

        if (this.speed_y > .5) this.speed_y = .5


        const y1 = map.array[Math.floor(this.x)]
        const y2 = map.array[Math.floor(this.x + 1)]
        const h1 = this.y > -y1
        const h2 = this.y > -y2

        if (h1 && h2) {
            const dir = y1 < y2 ? 1 : -1
            this.x -= dir * this.width

            h1 > h2 ? this.y = h1 - this.height : h1 - this.height

            this.speed_x = dir * random(.01, .02, 0)
            this.speed_y = -random(.01, .02, 0)
        }
    }
}

class Seed extends Upgrade {
    constructor(d) {
        super(d)

        this.plant = d.plant
    }

    update() {
        super.update()

        if (this.life_time < 0) {
            map.plantsOnScreen()
            map.plants.push(
                new Plant({
                    x: this.x + this.width / 2,
                    y: -map.array[Math.floor(this.x + this.width / 2)],
                    color: this.plant.color,
                    min_growth: this.plant.min_growth,
                    max_growth: this.plant.max_growth,
                    stem_limit_min: this.plant.stem_limit_min,
                    stem_limit_max: this.plant.stem_limit_max
                })
            )
            map.used_power.splice(map.used_power.indexOf(this), 1)
        }

        this.draw()
    }

    draw() {
        ctx.save()
        translate(.5, .5, this)
        rotate(this.speed_x * this.speed_y * 1e4)
        ctx.fillStyle = '#652'
        scaleRect(0, 0, 1, 1, this, .5, .5)
        ctx.restore()
    }
}

class SeedBomb extends Upgrade {
    constructor(d) {
        super(d)

        this.plant = d.plant
    }
    update() {
        super.update()

        const explode_amount = 30

        if (this.life_time < 0) {
            for (let i = 0; i < explode_amount; i ++) {
                map.used_power.push(
                    new Seed({
                        x: this.x + this.width / 2,
                        y: this.y + this.height / 2,
                        width: .06,
                        height: .06,
                        speed_x: random(-.2, .2, 0),
                        speed_y: -random(0, .3, 0),
                        life_time: 100,

                        plant: {
                            color: this.plant.color,
                            min_growth: this.plant.min_growth,
                            max_growth: this.plant.max_growth,
                            stem_limit_min: this.plant.stem_limit_min,
                            stem_limit_max: this.plant.stem_limit_max
                        }
                    })
                )
            }
            map.used_power.splice(map.used_power.indexOf(this), 1)
        }

        this.draw()
    }

    draw() {
        ctx.save()
        translate(.5, .5, this)
        rotate(this.speed_x * this.speed_y * 1e4)
        ctx.fillStyle = '#113'
        scaleRect(0, 0, 1, 1, this, .5, .5)
        ctx.restore()
    }
}

class Cloner extends Upgrade {
    constructor(d) {
        super(d)
    }
    update() {
        super.update()

        if (this.life_time < 0) {
            map.clones.push(
                new Clone(
                    this.x + this.width / 2,
                    -map.array[Math.floor(this.x + this.width / 2)],
                    .2, .2
                )
            )
            map.used_power.splice(map.used_power.indexOf(this), 1)
        }

        this.draw()
    }

    draw() {
        ctx.save()
        translate(.5, .5, this)
        rotate(this.speed_x * this.speed_y * 1e4)
        ctx.fillStyle = '#0f0'
        scaleRect(0, 0, 1, 1, this, .5, .5)
        ctx.restore()
    }
}

class Plant extends Base {
    constructor(d) {
        super()

        this.min_growth = d.min_growth
        this.max_growth = d.max_growth
        this.stem_limit_min = d.stem_limit_min
        this.stem_limit_max = d.stem_limit_max

        this.x = d.x - .5
        this.y = d.y - 1
        this.width = 1
        this.height = 1

        this.stems = [{
            x: d.x,
            y: d.y,
            angle: random(-20, 20),
            length: 0,
            goal_length: random(.1, .5, 0),
            color: '#543', complete: 0
        }]

        if (d.color.length == 1) {
            this.color = [
                random(50, 255),
                random(50, 255),
                random(50, 255),
                random(100, 255)
            ]

        }
        else this.color = d.color

        this.angle = random(0, 360)

        this.grow = true
        this.die = false
    }

    death() {
        let item = this.stems[this.stems.length - 1]

        this.color[3] -= this.color[3] / 10
        item.length -= (item.length + 1) * item.goal_length / (20 / this.stems.length)

        if (item.length <= 0) this.stems.splice(this.stems.length - 1, 1)

        if (this.stems.length <= 0) {
            map.plants.splice(map.plants.indexOf(this), 1)
            map.plant_screen.splice(map.plant_screen.indexOf(this), 1)
        }
    }

    update() {
        if (!this.onScreen()) {
            map.plants_on_screen --
            return
        }

        if (this.die) {
            this.death()
            this.draw()
            return
        }

        if (this.grow) {
            this.stems.forEach(item => {
                if (item.length < item.goal_length)
                    item.length += (item.length + 1) * item.goal_length / 20
                else item.complete ++

                if (item.complete == 1) {
                    const growth_amount = random(this.min_growth, this.max_growth)
                    for (let i = 0; i < growth_amount; i ++) {
                        this.stems.push({
                            x: item.x +
                                cos(item.angle - 90) * item.length,
                            y: item.y + 
                                sin(item.angle - 90) * item.length,
                            angle: item.angle + random(-30, 30, 0),
                            length: 0,
                            goal_length: random(.1, .3, 0),
                            color: rgb(50, random(50, 100), 0),
                            complete: 0
                        })
                    }
                }

                if (this.stems.length > random(this.stem_limit_min, this.stem_limit_max)) this.grow = false
            })
        }

        this.draw()
    }

    draw() {
        this.stems.forEach((item, index) => {
            ctx.beginPath()

            ctx.strokeStyle = item.color
            line(
                item.x, item.y,
                item.x + cos(item.angle - 90) * item.length,
                item.y + sin(item.angle - 90) * item.length, .01
            )
            ctx.fillStyle = rgb(
                this.color[0] + ((index * 99) % 255),
                this.color[1],
                this.color[2],
                this.color[3]
            )
            stretchRect(
                cos(item.angle - 90) * item.length - .025,
                sin(item.angle - 90) * item.length - .025,
                .05, .05, {x: item.x, y: item.y, width: 1, height: 1}
            )
        })
    }
}

class Screen {
    constructor() {
        this.set()
    }

    set() {
        this.numbers = []

        this.sun = {
            r: 255,
            g: 68,
            b: 0
        }
        this.sky = {
            r: 0,
            g: 0,
            b: 0
        }
        this.mist = {
            r: 0,
            g: 0,
            b: 0,
            a: 255
        }
        this.fade = {
            r: 0,
            g: 0,
            b: 0,
            a: 0,
            type: 'in'
        }

        this.time = 0
    }

    background() {
        const gradient = ctx.createRadialGradient(
            cvs.width / 2, cvs.height / 2, cvs.height / 3,
            cvs.width / 2, cvs.height / 2, cvs.width / 1.5
        )
        gradient.addColorStop(0, rgb(
            this.sun.r,
            this.sun.g,
            this.sun.b
        ))
        gradient.addColorStop(1, rgb(
            this.sky.r,
            this.sky.g,
            this.sky.b
        ))
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, cvs.width, cvs.height)
    }

    foreground() {
        this.time += .1

        const gradient = ctx.createRadialGradient(
            cvs.width / 2, cvs.height / 2, cvs.height / 3,
            cvs.width / 2, cvs.height / 2, cvs.width / 1.5
        )
        gradient.addColorStop(0, '#0000')
        gradient.addColorStop(1, rgb(
            this.mist.r,
            this.mist.g,
            this.mist.b,
            this.mist.a
        ))
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        ctx.fillStyle = '#fff'

        // health
            let size = (cvs.width + cvs.height) / 50
            if (size < 20) size = 20

            ctx.textAlign = 'center'
            ctx.font = size + 'px tahoma'
            let str = ''
            for (let i = 0; i < hero.health; i ++) str += '♥'
            ctx.fillText(str, cvs.width / 2, size + Math.sin(this.time))

        // details
            size = (cvs.width + cvs.height) / 80
            if (size < 20) size = 20

            ctx.textAlign = 'left'
            ctx.font = size + 'px monospace'
            ctx.fillText(
                'UPGRADE: ' + hero.upgrade.toUpperCase() +
                ' (X TO THROW)', 5, size
            )
            ctx.fillText(
                'POWER: '
                + ~~hero.power + ' / ' + hero.max_power, 5, size * 2
            )

        // numbers
            this.numbers.forEach(item => {
                item.update()
            })
    }

    fadeOut() {
        if (this.fade.type != 'out') return

        this.fade.a += 3
        ctx.fillStyle = rgb(
            this.fade.r,
            this.fade.g,
            this.fade.b,
            this.fade.a
        )
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        let size = (cvs.width + cvs.height) / 50
        if (size < 20) size = 20

        ctx.font = size + 'px monospace'
        ctx.fillStyle = rgb(255, 255, 255, this.fade.a)
        ctx.textAlign = 'center'
        if (map.level == map.level_end - 2)
            ctx.fillText('FINAL LEVEl', cvs.width / 2, cvs.height / 2)
        else
            ctx.fillText('LEVEl ' + (map.level + 1), cvs.width / 2, cvs.height / 2)
        cam.zoom += 1

        if (this.fade.a >= 255) return true
        return false
    }

    fadeIn() {
        if (this.fade.type != 'in') return

        this.fade.a -= 3
        ctx.fillStyle = rgb(
            this.fade.r,
            this.fade.g,
            this.fade.b,
            this.fade.a
        )
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        let size = (cvs.width + cvs.height) / 50
        if (size < 20) size = 20

        ctx.font = size + 'px monospace'
        ctx.fillStyle = rgb(255, 255, 255, this.fade.a)
        ctx.textAlign = 'center'

        if (map.level == map.level_end - 1)
            ctx.fillText('FINAL LEVEl', cvs.width / 2, cvs.height / 2)
        else
            ctx.fillText('LEVEl ' + map.level, cvs.width / 2, cvs.height / 2)

        if (this.fade.a <= 0) {
            this.fade.a = 0
            return true
        }
        return false
    }

    over() {
        if (this.fade.type != 'over') return

        this.fade.a += 4
        ctx.fillStyle = rgb(
            0, 0, 0,
            this.fade.a
        )
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        let size = (cvs.width + cvs.height) / 30
        if (size < 20) size = 20

        ctx.font = size + 'px monospace'
        ctx.fillStyle = rgb(255, 255, 255, this.fade.a)
        ctx.textAlign = 'center'
        ctx.fillText('GAME OVER', cvs.width / 2, cvs.height / 2)

        if (this.fade.a >= 1000) {
            restart()
            game = false
        }
    }

    win() {
        if (this.fade.type != 'win') return

        this.fade.a += 1
        ctx.fillStyle = rgb(
            255, 255, 255,
            this.fade.a
        )
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        let size = (cvs.width + cvs.height) / 30
        if (size < 20) size = 20

        ctx.font = size + 'px monospace'
        ctx.fillStyle = rgb(0, 0, 0, this.fade.a)
        ctx.textAlign = 'center'
        ctx.fillText('MISSION CLOMPLETE', cvs.width / 2, cvs.height / 2)
    }
}

class Number {
    constructor(d, scale_pos = true) {
        if (scale_pos) {
            this.x = d.x * scale - cam.offset_x
            this.y = d.y * scale - cam.offset_y
        }
        else {
            this.x = d.x
            this.y = d.y
        }
        this.speed_x = d.speed_x
        this.speed_y = d.speed_y
        this.text = d.text
        this.color = d.color
        this.fade_speed = d.fade_speed

        if (this.color.length == 1) this.color = [255, 255, 255, 255]
    }

    update() {
        this.x += this.speed_x
        this.y += this.speed_y

        this.color[3] -= this.fade_speed

        if (this.color[3] <= 0)
            screen.numbers.splice(screen.numbers.indexOf(this), 1)

        this.draw()
    }

    draw() {
        ctx.fillStyle = rgb(
            this.color[0],
            this.color[1],
            this.color[2],
            this.color[3]
        )
        ctx.font = (cvs.width + cvs.height) / 80 + 'px arial'
        ctx.textAlign = 'center'
        ctx.fillText(this.text, this.x, this.y)

    }
}

function random(min, max, int = 1) {
    /* note: this rounds the min and max
    values down. so random(2, 8) would be
    any number between 2 and 7 inclusive */

    const value = Math.random() * (max - min) + min

    return int ? Math.floor(value) : value
}

function translate(x, y, obj) {
    x = x * obj.width
    y = y * obj.height
    return ctx.translate(
        (x + obj.x) * scale - cam.offset_x,
        (y + obj.y) * scale - cam.offset_y
    )
}

function collide(obj1, obj2) {
    /* Detects if the base object is
    colliding with the input object.*/

    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    )
}

function merge(obj1, obj2) {
    /* Detects the smallest overlap of
    the input object with the base object.
    It is useful for stopping the base
    object from going through solid
    objects like the ground. */

    const margin = { // off the base object
        left: (obj1.x + obj1.width) - obj2.x,
        right: obj1.x - (obj2.x + obj2.width),
        top: (obj1.y + obj1.height) - obj2.y,
        bottom: obj1.y - (obj2.y + obj2.height)
    }

    const smallest_x =
        margin.left < -margin.right ?
        margin.left : margin.right
    const smallest_y =
        margin.top < -margin.bottom ?
        margin.top : margin.bottom

    if (Math.abs(smallest_x) < Math.abs(smallest_y) - obj1.speed_y)
        return {x: smallest_x, y: 0}
    return {x: 0, y: smallest_y}
}

function rotate(angle) {
    return ctx.rotate((angle % 360) * Math.PI / 180)
}

function cos(angle) {
    return Math.cos(angle * Math.PI / 180)
}

function sin(angle) {
    return Math.sin(angle * Math.PI / 180)
}

function line(x1, y1, x2, y2, width) {
    ctx.lineWidth = width * scale
    ctx.moveTo(
        x1 * scale - cam.offset_x,
        y1 * scale - cam.offset_y
    )
    ctx.lineTo(
        x2 * scale - cam.offset_x,
        y2 * scale - cam.offset_y
    )
    ctx.stroke()
}

function stretch(x, y, width, height, obj) {
    /* stretches the positions & sizes
    to the object put into the function
    parameters */

    return {
        x: x * obj.width,
        y: y * obj.height,
        width: width * obj.width,
        height: height * obj.height
    }
}

function scaleRect(x, y, width, height, obj, ahr_x = 0, ahr_y = 0) {
    /* draws and stretches the rectangle
    with the scale applied */

    x = x * obj.width
    y = y * obj.height
    width = width * obj.width
    height = height * obj.height
    ahr_x = ahr_x * obj.width
    ahr_y = ahr_y * obj.height

    return ctx.fillRect(
        (x - ahr_x) * scale,
        (y - ahr_y) * scale,
        width * scale, height * scale
    )
}

function scaleCir(x, y, radius, obj, ahr_x = 0, ahr_y = 0) {
    /* draws and stretches the
    cirle with the scale applied */

    x = x * obj.width
    y = y * obj.height
    radius = radius * (obj.width > obj.height ? obj.height : obj.width)
    ahr_x = ahr_x * obj.width
    ahr_y = ahr_y * obj.height
    return (
        ctx.beginPath(),
        
        ctx.fill(ctx.arc(
            (x - ahr_x) * scale,
            (y - ahr_y) * scale, 
            radius * scale, 0, 7))
    )
}

function stretchRect(x, y, width, height, obj) {
    /* draws and stretches the rectangle
    with the scale and cam pos applied */

    x = x * obj.width
    y = y * obj.height
    width = width * obj.width
    height = height * obj.height

    ctx.fillRect(
        (obj.x + x) * scale - cam.offset_x,
        (obj.y + y) * scale - cam.offset_y,
        width * scale,
        height * scale
    )
}

function stretchCir(x, y, radius, obj) {
    /* draws and stretches the circle
    with the scale and cam pos applied */

    x = x * obj.width
    y = y * obj.height
    radius = radius * (obj.width > obj.height ? obj.height : obj.width)

    ctx.beginPath()

    ctx.fill(ctx.arc(
        (obj.x + x) * scale - cam.offset_x,
        (obj.y + y) * scale - cam.offset_y,
        radius * scale, 0, 7
    ))
}

function rgb(red, green, blue, alpha = 255) {
    return `rgb(${red}, ${green}, ${blue}, ${alpha / 255})`
}

function resize() {
    cvs.width = innerWidth
    cvs.height = innerHeight
}

function update() {
    ctx.clearRect(0, 0, cvs.width, cvs.height)
    scale = cvs.width / cam.zoom

    screen.background()
    cam.update()
    map.update()
    screen.foreground()

    screen.fadeOut()
    screen.fadeIn()
    screen.over()
    screen.win()

    if (hero.power < 0) hero.power = 0
    if (hero.power > hero.max_power) hero.power = hero.max_power

    game ? requestAnimationFrame(update) : start()
}

function restart() {
    cam.zoom = 50
    map.level = 0
    map.width = map.level_end
    map.set()
    map.generate()

    hero.reset()
    screen.set()
}

function start() {
    const size = cvs.width / 9

    ctx.fillStyle = '#333'
    ctx.fillRect(0, 0, cvs.width, cvs.height)
    ctx.textAlign = 'center'

    ctx.font = size + 'px tahoma'
    ctx.fillStyle = '#fff'
    ctx.fillText(
        'THE MITIGATOR',
        cvs.width / 2 + Math.cos(Date.now() % 9),
        cvs.height / 2 + Math.sin(Date.now() % 9)
    )

    ctx.fillStyle = rgb(Date.now() % 200, 200, 200)
    ctx.font = size / 3 + 'px tahoma'
    ctx.fillText('X to play', cvs.width / 2, cvs.height / 2 + size)

    if (key.x) {
        game = true
        update()
    }
    else requestAnimationFrame(start)
}

const key = {
    arrowup: false,
    arrowleft: false,
    arrowright: false,

    w: false,
    a: false,
    d: false,

    z: false,
    q: false,
    d: false,

    x: false
}
const ctx = cvs.getContext('2d')

const cam = new Camera(0, 0)
const map = new World()
const hero = new Player(.25, .3)
const screen = new Screen()

const gravity = .01
let scale = 0
let game = false

map.generate()
addEventListener('resize', resize)
addEventListener('keydown', e => {
    if (e.repeat) return

    if (key[e.key.toLowerCase()] != undefined)
        key[e.key.toLowerCase()] = true
    
    if ((e.key == 'x' || e.key == ' ') && hero.health && ~~hero.power) hero.throw()
})
addEventListener('keyup', e => {
    if (key[e.key.toLowerCase()] != undefined)
        key[e.key.toLowerCase()] = false
})
resize()
start()
