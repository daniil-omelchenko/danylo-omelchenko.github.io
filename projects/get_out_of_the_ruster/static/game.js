var levels = [];
const levels_count = levels.length;

async function loadLevels(count) {
    for (let i = 0; i < count; i++) {
        const resp = await fetch(`static/levels/level${i}.txt`);
        const text = await resp.text();
        const body = text.split('\n');
        const [x, y] = [body[0].length, body.length];
        levels.push({
            size: {x, y},
            body
        });
    }
}

loadLevels(8).then(() => {
        let current_level = 0;
        let score = 0;

        let default_font_style = {font: "bold 64px Arial", fill: "#fff", boundsAlignH: "center", boundsAlignV: "middle"};

        // to avoid double downgrade
        let restarted = false;

        let lava_sound;
        let background_music;

        let state = {

            preload: function () {
                // Here we preload the assets
                game.load.image('player', 'static/assets/player.png');
                game.load.image('wall', 'static/assets/wall.png');
                game.load.image('coin', 'static/assets/coin.png');
                game.load.image('lava', 'static/assets/lava.png');
                game.load.image('enemy', 'static/assets/enemy.png');
                game.load.image('smaller', 'static/assets/smaller.png');
                game.load.image('larger', 'static/assets/larger.png');

                game.load.image('spark', 'static/assets/spark.png');
                game.load.image('blood', 'static/assets/blood.png');
                game.load.image('parts', 'static/assets/parts.png');
                game.load.image('lava_splash', 'static/assets/lava_splash.png');
                game.load.image('dark', 'static/assets/dark.png');

                game.load.audio('step1', 'static/sounds/step1.mp3');
                game.load.audio('step2', 'static/sounds/step2.mp3');
                game.load.audio('step3', 'static/sounds/step3.mp3');
                game.load.audio('step4', 'static/sounds/step4.mp3');
                game.load.audio('eat1', 'static/sounds/eat1.mp3');
                game.load.audio('eat2', 'static/sounds/eat2.mp3');
                game.load.audio('eat3', 'static/sounds/eat3.mp3');

                game.load.audio('lavapop', 'static/sounds/lavapop.mp3');
                game.load.audio('coin', 'static/sounds/coin.mp3');
                game.load.audio('fizz', 'static/sounds/fizz.mp3');
                game.load.audio('fire', 'static/sounds/fire.mp3');
                game.load.audio('death', 'static/sounds/death.mp3');
                game.load.audio('success', 'static/sounds/success.mp3');
                game.load.audio('lava', 'static/sounds/lava.mp3');
                game.load.audio('background', 'static/sounds/background.mp3');
            },

            randomSound: function (seq) {
                game.add.sound(seq[Math.floor(Math.random() * seq.length)]).play();
            },

            create: function () {
                if (!background_music) {
                    background_music = game.add.sound("background");
                    background_music.loop = true;
                    background_music.play();
                }
                restarted = false;

                // Set the background color to blue
                game.stage.backgroundColor = '#8FC2FF';

                // Start the Arcade physics system (for movements and collisions)
                game.physics.startSystem(Phaser.Physics.ARCADE);

                // Add the physics engine to all game objects
                game.world.enableBody = true;

                // Variable to store the arrow key pressed
                this.cursor = game.input.keyboard.createCursorKeys();

                this.createMap(levels[current_level]);
            },

            update: function () {
                // Here we update the game 60 times per second
                var before_y = this.player.body.velocity.y;

                game.physics.arcade.collide(this.player, this.walls, function () {
                    if (
                        before_y > 10 &&
                        !(this.player.body.velocity.x == 0 && (this.cursor.left.isDown || this.cursor.right.isDown))) {
                        this.randomSound(["step1", "step2", "step3", "step4"]);
                    }
                }, null, this);

                game.physics.arcade.overlap(this.player, this.coins, this.takeCoin, null, this);

                game.physics.arcade.overlap(this.player, this.smallers, this.smaller, null, this);
                game.physics.arcade.overlap(this.player, this.largers, this.larger, null, this);

                game.physics.arcade.overlap(this.player, this.lavas, this.fireDeath, null, this);

                game.physics.arcade.overlap(this.player, this.enemies, this.fight, null, this);

                game.physics.arcade.overlap(this.enemies, this.walls, this.enemyTurn, null, this);
                game.physics.arcade.overlap(this.enemies, this.stops, this.enemyTurn, null, this);
                game.physics.arcade.overlap(this.enemies, this.lavas, this.enemyTurn, null, this);


                // Move the player when an arrow key is pressed
                if (this.cursor.left.isDown) {
                    this.player.body.velocity.x = -this.player.agility * 0.8;
                } else if (this.cursor.right.isDown) {
                    this.player.body.velocity.x = this.player.agility * 0.8;
                } else {
                    this.player.body.velocity.x = 0;
                }
                if (this.cursor.up.isDown && this.player.body.touching.down) {
                    this.player.body.velocity.y = -this.player.agility;
                }

                // turn off lava sound when it actually on the scene
                if (lava_sound) lava_sound.volume = 0;
                for (var i = 0; i < this.lavas.hash.length; i++) {
                    if (this.lavas.hash[i].inCamera && lava_sound) {
                        lava_sound.volume = 0.2;
                    }
                }
            },

            smaller: function (player, smaller) {
                this.randomSound(["eat1", "eat2", "eat3"]);
                player.current_size--;
                smaller.kill();
                this.explode('dark', smaller);
                if (player.current_size < 0) {
                    player.current_size = 0;
                }
                this.changeSize(player);
            },

            larger: function (player, larger) {
                this.randomSound(["eat1", "eat2", "eat3"]);
                player.current_size++;
                larger.kill();
                this.explode('dark', larger);
                if (player.current_size > 2) {
                    current_size = 2;
                }
                this.changeSize(player, player.current_size);
            },

            changeSize: function (player) {
                if (player.height < player.current_size * 32)
                    player.y -= player.height;
                var sizes = {
                    0: function () {
                        player.width = 16;
                        player.height = 16;
                        player.agility = 290;
                        player.killability = false;
                        player.killable = true;
                    },
                    1: function () {
                        player.width = 31;
                        player.height = 31;
                        player.agility = 250;
                        player.killability = true;
                        player.killable = true;
                    },
                    2: function () {
                        player.width = 63;
                        player.height = 63;
                        player.agility = 150;
                        player.killability = true;
                        player.killable = false;
                    }
                };
                sizes[player.current_size]();
            },

            createMap: function (level) {
                if (lava_sound) lava_sound.stop();
                lava_sound = null;

                this.walls = game.add.group();
                this.coins = game.add.group();
                this.lavas = game.add.group();
                this.enemies = game.add.group();
                this.smallers = game.add.group();
                this.largers = game.add.group();
                this.stops = game.add.group();

                game.world.setBounds(0, 0,
                    level.size.x * 32,
                    level.size.y * 32
                );

                for (var i = 0; i < level.body.length; i++) {
                    for (var j = 0; j < level.body[i].length; j++) {

                        if (level.body[i][j] == 'p') {
                            this.player = game.add.sprite(32 * j, 32 * i, 'player');
                            this.player.body.gravity.y = 600;
                            this.player.agility = 250;
                            this.player.killability = true;
                            this.player.killable = true;
                            this.player.current_size = 1;
                        }

                        if (level.body[i][j] == '.') {
                            var stop = game.add.sprite(32 * j + 8, 32 * i + 16);
                            stop.body.immovable = true;
                            this.stops.add(stop);
                        }

                        if (level.body[i][j] == '-') {
                            var smaller = game.add.sprite(32 * j + 8, 32 * i + 16, 'smaller');
                            this.smallers.add(smaller);
                        }

                        if (level.body[i][j] == '+') {
                            var larger = game.add.sprite(32 * j, 32 * i, 'larger');
                            this.largers.add(larger);
                        }

                        // Create a coin and add it to the 'coins' group
                        else if (level.body[i][j] == 'o') {
                            var coin = game.add.sprite(32 * j, 32 * i, 'coin');
                            this.coins.add(coin);
                        }

                        // Create a enemy and add it to the 'lava' group
                        else if (level.body[i][j] == '!') {
                            if (!lava_sound) {
                                lava_sound = game.add.sound("lava");
                                lava_sound.loop = true;
                                lava_sound.volume = 0.2;
                            }

                            var lava = game.add.sprite(32 * j, 32 * i, 'lava');
                            lava.body.immovable = true;
                            this.lavas.add(lava);

                            if (level.body[i - 1] && level.body[i - 1][j] == ' ') {
                                var emitter = game.add.emitter(lava.x + lava.width / 2, lava.y, 100);
                                emitter.makeParticles('lava_splash');
                                emitter.gravity = 800;
                                emitter.width = lava.width;
                                emitter.minParticleSpeed.setTo(-10, -200);
                                emitter.maxParticleSpeed.setTo(10, -100);
                                var frequency = Math.floor(Math.random() * 4000 + 2000);
                                emitter.start(false, 400, frequency);
                                game.time.events.loop(frequency, function () {
                                    if (this.inCamera) {
                                        var s = game.add.sound("lavapop");
                                        s.volume = 0.2;
                                        s.play();
                                    }
                                }, lava);
                            }

                            if (level.body[i + 1] && level.body[i + 1][j] == ' ') {
                                emitter = game.add.emitter(lava.x + lava.width / 2, lava.y + lava.height, 100);
                                emitter.makeParticles('lava_splash');
                                emitter.gravity = 800;
                                emitter.width = lava.width;
                                emitter.minParticleSpeed.setTo(0, 100);
                                emitter.maxParticleSpeed.setTo(0, 150);
                                emitter.start(false, 400, Math.floor(Math.random() * 6000 + 1000));
                            }
                        }

                        // Create a enemy and add it to the 'enemies' group
                        else if (level.body[i][j] == '#') {
                            var enemy = game.add.sprite(32 * j, 32 * i, 'enemy');
                            enemy.body.velocity.x = 50 * [-1, 1][Math.floor(Math.random() * 2)];
                            this.enemies.add(enemy);
                        }
                    }

                }

                if (lava_sound) lava_sound.play();

                for (j = 0; j < level.body[0].length; j++) {
                    var is_wall = false;
                    var start = 0;
                    for (i = 0; i < level.body.length; i++) {
                        if (level.body[i][j] == 'x' && !is_wall) {
                            is_wall = true;
                            start = i;
                        }
                        if (level.body[i][j] != 'x' && is_wall) {
                            is_wall = false;
                            var wall = game.add.sprite(32 * j, 32 * start, 'wall');
                            wall.scale.y = i - start;
                            wall.body.immovable = true;
                            this.walls.add(wall);
                        }
                        if (i == level.body.length - 1 && is_wall) {
                            is_wall = false;
                            var wall = game.add.sprite(32 * j, 32 * start, 'wall');
                            wall.scale.y = i - start + 1;
                            wall.body.immovable = true;
                            this.walls.add(wall);
                        }
                    }
                }

                this.showText('LEVEL ' + (current_level + 1), true);

                game.camera.follow(this.player, Phaser.Camera.FOLLOW_LOCKON, 0.1, 0.1);
            },

            enemyTurn: function (enemy) {
                enemy.body.velocity.x = -enemy.body.velocity.x;
            },

            fight: function (player, enemy) {
                if (enemy.position.y - player.position.y < player.height && player.killable || !player.killability) {
                    this.explode('parts', this.player);
                    game.add.audio('death').play();
                    this.gameOver();
                } else {
                    player.body.velocity.y = -250;
                    game.add.audio('coin').play();
                    enemy.kill();
                    this.explode('blood', enemy);
                }
            },

            takeCoin: function (player, coin) {
                game.add.audio('coin').play();
                coin.kill();
                this.explode('spark', coin);

                if (this.coins.total == 0) {
                    this.levelComplete();
                }
            },

            fireDeath: function (player, lava) {
                this.gameOver();
                game.add.audio('fizz').play();
                game.add.audio('fire').play();
                this.explode('lava_splash', this.player);
            },

            explode: function (sprite, obj) {
                var emitter = game.add.emitter(obj.x + obj.width / 2, obj.y + obj.height / 2, 100);
                emitter.makeParticles(sprite);
                emitter.gravity = 700;
                emitter.minParticleSpeed.setTo(-200, -200);
                emitter.maxParticleSpeed.setTo(200, 200);
                emitter.start(true, 800, null, 16);
            },

            showText: function (message, fade) {
                var text = game.add.text(game.width / 2, game.height / 2, message, default_font_style);
                text.anchor.x = 0.5;
                text.anchor.y = 0.5;
                text.fixedToCamera = true;
                if (fade) {
                    game.add.tween(text).to({alpha: 0}, 1500, Phaser.Easing.Linear.None, true);
                }
            },

            levelComplete: function () {
                current_level++;
                game.add.sound("success").play();
                this.showText('LEVEL COMPLETE');
                this.player.body.velocity.x = 0;
                this.player.body.velocity.y = 0;
                this.player.kill();
                game.time.events.add(
                    2000,
                    function () {
                        if (current_level >= levels_count) {
                            window.location.href = '/';
                        }
                        game.state.start('main');
                    },
                    this
                );
            },

            gameOver: function () {
                this.player.kill();
                this.showText('GAME OVER');
                this.player.body.velocity.x = 0;
                this.player.body.velocity.y = 0;
                game.time.events.add(
                    1500, this.restart, this
                );
            },

            restart: function (level) {
                if (level !== undefined) {
                    current_level = level;
                } else if (!restarted) {
                    current_level--;
                    restarted = true;
                }
                game.state.start('main');
            }

        };

        let game = new Phaser.Game(32 * 27, 32 * 9);
        game.state.add('main', state);
        game.state.start('main');
    }
);
