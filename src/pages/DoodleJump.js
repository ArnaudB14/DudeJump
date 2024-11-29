import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';

var platforms;
var player;
var cursors;
var score = 0;
var scoreText;
var maxY;
var gameOver;
var boosts;
var stars;
var bonusScore = 0;
var normalSpeed = 260; // Vitesse par défaut
var normalJump = -650; // Hauteur de saut normale
var normalGravity = 600; // Gravité par défaut

class Example extends Phaser.Scene {

    init(data) {
        // Charge l'apparence depuis localStorage ou utilise 'dude' par défaut
        this.currentAppearance = data.appearance || localStorage.getItem('playerAppearance') || 'dude';
    }


    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.image('ground_trap', 'assets/platform_trap.png');
        this.load.image('ground_speed', 'assets/platform_speed.png');
        this.load.spritesheet('dude',
            'assets/player.png',
            { frameWidth: 32, frameHeight: 32 }
        );
        this.load.spritesheet('dude2',
            'assets/player2.png',
            { frameWidth: 42, frameHeight: 42 }
        );
        this.load.spritesheet('dude3',
            'assets/player3.png',
            { frameWidth: 32, frameHeight: 48 }
        );
        this.load.spritesheet('dude4',
            'assets/player4.png',
            { frameWidth: 32, frameHeight: 32 }
        );
        this.load.spritesheet('dude5',
            'assets/player5.png',
            { frameWidth: 32, frameHeight: 32 }
        );
        this.load.spritesheet('jump', 'assets/jump.png', {
            frameWidth: 48, // Largeur d'un frame
            frameHeight: 48, // Hauteur d'un frame
        });
        this.load.image('star', 'assets/star.png');
        this.load.image('fall', 'assets/fall.png');
        this.load.image('fall4', 'assets/fall4.png');
        this.load.image('fall5', 'assets/fall5.png');
        this.load.image('arrow', 'assets/arrow.png');
    }

    create() {

        // Supprimer les animations existantes
        gameOver = false;

        this.isControlsReversed = false;
        this.physics.world.gravity.y = normalGravity;
        this.isSpeedBoosted = false;

        // Arrière-plan ajusté pour la nouvelle taille
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'sky')
            .setScrollFactor(0)
            .setDisplaySize(this.scale.width, this.scale.height); // Centré sur 500x700

        // Plateformes dynamiques
        platforms = this.physics.add.staticGroup();

        const ground = platforms.create(this.scale.width / 2, this.scale.height - 10, 'ground');
        ground.setScale(1.5, 0.5); // Ajuster la taille visuellement
        ground.body.updateFromGameObject();

        let lastPlatformY = 600;

        // Générer les premières plateformes
        for (let i = 0; i < 4; i++) {
            const x = Phaser.Math.Between(100, 400); // Limité à la nouvelle largeur
            const y = lastPlatformY - Phaser.Math.Between(120, 200);// Espacement vertical ajusté pour 700px de hauteur

            const platform = platforms.create(x, y, 'ground');
            platform.setScale(0.21, 0.6).refreshBody(); // Ajuste la taille des plateformes
            platform.body.updateFromGameObject();

            lastPlatformY = y;
        }

        // Joueur
        player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 100, this.currentAppearance).setScale(1.75);

        this.fallImage = this.add.image(250, 600, 'fall').setScale(1.75);;
        this.fallImage.setVisible(false);

        this.fallImage4 = this.add.image(250, 600, 'fall4').setScale(1.75);;
        this.fallImage4.setVisible(false);

        this.fallImage5 = this.add.image(250, 600, 'fall5').setScale(1.75);;
        this.fallImage5.setVisible(false);

        boosts = this.physics.add.group();

        stars = this.physics.add.group();

        this.physics.add.overlap(player, stars, this.collectStar, null, this);

        // Configuration du joueur
        player.setCollideWorldBounds(false);
        player.body.checkCollision.up = false;
        player.body.checkCollision.left = false;
        player.body.checkCollision.right = false;

        const animationFrames = {
            dude: {
                left: { start: 0, end: 11 },
                turn: { frame: 15 },
                right: { start: 12, end: 23 },
            },
            dude2: {
                left: { start: 0, end: 4 },
                turn: { frame: 8 },
                right: { start: 7, end: 11 },
            },
            dude3: {
                left: { start: 0, end: 3 }, // Ajustez selon les frames disponibles pour `dude3`
                turn: { frame: 4 },
                right: { start: 5, end: 8 },
            },
            dude4: {
                left: { start: 0, end: 11 },
                turn: { frame: 15 },
                right: { start: 12, end: 23 },
            },
            dude5: {
                left: { start: 0, end: 11 },
                turn: { frame: 15 },
                right: { start: 12, end: 23 },
            },
        };
        
        // Génération d'animations dynamiques en fonction de l'apparence
        const currentFrames = animationFrames[this.currentAppearance];

        this.anims.remove('left');
        this.anims.remove('right');
        this.anims.remove('turn');
        
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers(this.currentAppearance, { start: currentFrames.left.start, end: currentFrames.left.end }),
            frameRate: 10,
            repeat: -1,
        });
        
        this.anims.create({
            key: 'turn',
            frames: [{ key: this.currentAppearance, frame: currentFrames.turn.frame }],
            frameRate: 20,
        });
        
        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers(this.currentAppearance, { start: currentFrames.right.start, end: currentFrames.right.end }),
            frameRate: 10,
            repeat: -1,
        });


        this.anims.create({
            key: 'boost-hit',
            frames: this.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
            frameRate: 15,
            repeat: 0, // L'animation ne se répète pas
        });


        // Collision entre joueur et plateformes
        this.physics.add.collider(player, platforms, this.checkPlatform, null, this);

        this.physics.add.overlap(player, boosts, this.hitBoost, null, this);

        // Caméra qui suit le joueur
        this.cameras.main.startFollow(player);
        this.cameras.main.setDeadzone(this.scale.width * 1.5);

        // Contrôles clavier
        cursors = this.input.keyboard.createCursorKeys();

        // Score
        scoreText = this.add.text(10, 10, 'Score: 0', {
            fontSize: '24px',
            fill: '#000',
        }).setScrollFactor(0);

        // Button mobile
        this.isLeftPressed = false;
        this.isRightPressed = false;

        const leftButton = this.add.image(75, this.scale.height - 50, 'arrow')
            .setInteractive()
            .setScrollFactor(0)
            .setOrigin(0.5)
            .setScale(1)
            .setAlpha(0.8);
        leftButton.setFlipX(true); // Inverse horizontalement pour la flèche gauche

        // Bouton droit
        const rightButton = this.add.image(this.scale.width - 75, this.scale.height - 50, 'arrow')
            .setInteractive()
            .setScrollFactor(0)
            .setOrigin(0.5)
            .setScale(1)
            .setAlpha(0.8);


        // Événements pour le bouton gauche
        leftButton.on('pointerdown', () => {
            this.isLeftPressed = true;
        });
        leftButton.on('pointerup', () => {
            this.isLeftPressed = false;
        });

        // Événements pour le bouton droit
        rightButton.on('pointerdown', () => {
            this.isRightPressed = true;
        });
        rightButton.on('pointerup', () => {
            this.isRightPressed = false;
        });



        maxY = player.y;
    }

    update() {
        if (gameOver) {
            return; // Empêche toute autre logique pendant le Game Over
        }

        const bottomPlatform = this.findBottomMostPlatform();

        // GAME OVER
        if (player.y > bottomPlatform.y + 200 && !gameOver) {
            gameOver = true;
            player.setVisible(false);
            player.anims.stop();

            // Overlay semi-transparent
            const overlay = this.add.graphics();
            overlay.fillStyle(0x000000, 0.5);
            overlay.fillRect(0, 0, this.scale.width, this.scale.height);
            overlay.setScrollFactor(0);

            // Texte "GAME OVER"
            const gameOverText = this.add.text(this.scale.width / 2, this.scale.height / 2 - 100, 'GAME OVER', {
                fontSize: `${this.scale.width / 10}px`, // Taille de police adaptative
                fill: '#fff',
            }).setOrigin(0.5, 0.5).setScrollFactor(0);

            // Mettre à jour les meilleurs scores
            this.updateHighScores(score);

            // Afficher les meilleurs scores
            const highScores = this.getHighScores();
            let scoreText = 'Top Scores:\n';
            highScores.forEach((highScore, index) => {
                scoreText += `${index + 1}. ${highScore}\n`;
            });

            const highScoresText = this.add.text(this.scale.width / 2, this.scale.height / 2, scoreText, {
                fontSize: `${this.scale.width / 20}px`,
                fill: '#fff',
            }).setOrigin(0.5, 0.5).setScrollFactor(0);


            // Bouton "Restart"
            const restartButton = this.add
                .text(this.scale.width / 2, this.scale.height / 2 + 150, 'Rééssayer', {
                    fontSize: `${this.scale.width / 15}px`, // Taille de police adaptative
                    fill: '#fff',
                    backgroundColor: '#000',
                    padding: { x: 5, y: 5 },
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            restartButton.setInteractive({ useHandCursor: true });
            restartButton.on('pointerover', () => {
                restartButton.setStyle({ fill: 'lightgrey' });
            });
            restartButton.on('pointerout', () => {
                restartButton.setStyle({ fill: '#fff' });
            });
            restartButton.on('pointerdown', () => {
                this.scene.restart({ appearance: this.currentAppearance });
                score = 0;
                gameOver = false;
                normalSpeed = 260;
                normalJump = -650;
                this.isSpeedBoosted = false;
                this.isControlsReversed = false;
                this.physics.world.gravity.y = normalGravity;
                this.isDifficultyIncreased = false;
                this.isDifficultyIncreased2 = false;
                this.isDifficultyIncreased3 = false;
                this.heightScore = 0;
                bonusScore = 0;
            });



            // Bouton "Changer d'apparence"
            const changeAppearanceButton = this.add
                .text(this.scale.width / 2, this.scale.height / 2 + 200, 'Changer d\'apparence', {
                    fontSize: `${this.scale.width / 20}px`, // Taille de police adaptative
                    fill: '#fff',
                    backgroundColor: '#000',
                    padding: { x: 10, y: 5 },
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            changeAppearanceButton.setInteractive({ useHandCursor: true });
            changeAppearanceButton.on('pointerover', () => {
                changeAppearanceButton.setStyle({ fill: 'lightgrey' });
            });
            changeAppearanceButton.on('pointerout', () => {
                changeAppearanceButton.setStyle({ fill: '#fff' });
            });
            changeAppearanceButton.on('pointerdown', () => {
                // Supprimer les éléments de Game Over
                overlay.clear();
                gameOverText.setVisible(false);
                highScoresText.setVisible(false);
                restartButton.setVisible(false);
                changeAppearanceButton.setVisible(false);

                // Créer l'overlay pour le carrousel
                const overlayCarousel = this.add.graphics();
                overlayCarousel.fillStyle(0x000000, 0.5);
                overlayCarousel.fillRect(0, 0, this.scale.width, this.scale.height);
                overlayCarousel.setScrollFactor(0);

                const characterFrames = {
                    dude: 15,
                    dude2: 8, 
                    dude3: 4,
                    dude4: 15,
                    dude5: 15
                };

                // Titre pour le carrousel
                const carouselText = this.add.text(this.scale.width / 2, 200, 'APPARENCE', {
                    fontSize: `${this.scale.width / 10}px`, // Taille de police adaptative
                    fill: '#fff',
                }).setOrigin(0.5, 0.5).setScrollFactor(0);

                // Liste des personnages disponibles
                const characterOptions = ['dude', 'dude2', 'dude3', 'dude4', 'dude5'];
                let currentIndex = characterOptions.indexOf(this.currentAppearance);

                // Sprite du personnage actuel
                const characterImage = this.add.sprite(
                    this.scale.width / 2,
                    this.scale.height / 2,
                    characterOptions[currentIndex], // Le personnage actuel
                    characterFrames[characterOptions[currentIndex]] // La frame à afficher
                ).setScale(2).setScrollFactor(0).setDepth(101);

                // Flèche gauche pour naviguer
                const leftArrow = this.add.text(this.scale.width / 4, this.scale.height / 2, '<', {
                    fontSize: '40px',
                    fill: '#ffffff',
                }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
                leftArrow.setInteractive({ useHandCursor: true });
                leftArrow.on('pointerdown', () => {
                    currentIndex = (currentIndex - 1 + characterOptions.length) % characterOptions.length;
                    characterImage.setTexture(characterOptions[currentIndex]);
                    characterImage.setFrame(characterFrames[characterOptions[currentIndex]]); // Mise à jour de la frame
                });

                // Flèche droite pour naviguer
                const rightArrow = this.add.text((this.scale.width / 4) * 3, this.scale.height / 2, '>', {
                    fontSize: '40px',
                    fill: '#ffffff',
                }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
                rightArrow.setInteractive({ useHandCursor: true });
                rightArrow.on('pointerdown', () => {
                    currentIndex = (currentIndex + 1) % characterOptions.length;
                    characterImage.setTexture(characterOptions[currentIndex]);
                    characterImage.setFrame(characterFrames[characterOptions[currentIndex]]); // Mise à jour de la frame
                });

                // Bouton Valider
                const validateButton = this.add.text(this.scale.width / 2, this.scale.height - 100, 'VALIDER', {
                    fontSize: '24px',
                    fill: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 10, y: 5 },
                }).setOrigin(0.5).setScrollFactor(0).setDepth(101);

                validateButton.setInteractive({ useHandCursor: true });
                validateButton.on('pointerover', () => {
                    validateButton.setStyle({ fill: 'lightgrey' });
                });
                validateButton.on('pointerout', () => {
                    validateButton.setStyle({ fill: '#fff' });
                });

                validateButton.on('pointerdown', () => {
                    // Sauvegarder l'apparence sélectionnée
                    this.currentAppearance = characterOptions[currentIndex];
                    localStorage.setItem('playerAppearance', this.currentAppearance);

                    // Détruire les éléments du carousel
                    overlayCarousel.destroy();
                    carouselText.destroy();
                    characterImage.destroy();
                    leftArrow.destroy();
                    rightArrow.destroy();
                    validateButton.destroy();

                    // Réafficher les éléments de Game Over
                    overlay.fillStyle(0x000000, 0.5);
                    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
                    gameOverText.setVisible(true);
                    highScoresText.setVisible(true);
                    restartButton.setVisible(true);
                    changeAppearanceButton.setVisible(true);
                });
            });

        }

        let lastPlatformY = null;

        // Déplacer et régénérer les plateformes
        platforms.children.iterate((child) => {
            const platform = child;
            const scrollY = this.cameras.main.scrollY;

            if (platform.y >= scrollY + 700) {
                // Positionnement contrôlé
                const newY = lastPlatformY
                    ? lastPlatformY - Phaser.Math.Between(120, 200) // Espacement vertical contrôlé
                    : scrollY - Phaser.Math.Between(120, 200);

                const newX = Phaser.Math.Between(100, 400); // Limite horizontale

                platform.y = newY;
                platform.x = newX;
                platform.setScale(0.21, 0.6).refreshBody();

                // Supprimer le boost s'il existe
                if (platform.getData('boost')) {
                    platform.getData('boost').destroy();
                    platform.setData('boost', null);
                }

                if (platform.getData('star')) {
                    platform.getData('star').destroy();
                    platform.setData('star', null);
                }

                platform.setData('isTrap', false);
                platform.setData('isSpeed', false);
                platform.setTexture('ground');

                const isTrap = Phaser.Math.Between(1, 100) <= 3; // 3% de chance
                const isSpeed = Phaser.Math.Between(1, 100) <= 3; // 3% de chance uniquement si pas "trap"
        
                if (isTrap) {
                    platform.setTexture('ground_trap');
                    platform.setData('isTrap', true);
                } else if (isSpeed) {
                    platform.setTexture('ground_speed');
                    platform.setData('isSpeed', true);
                }
                
                if (!isTrap && !isSpeed) {
                    if (Phaser.Math.Between(1, 100) <= 3) {
                        const boost = boosts.create(platform.x, platform.y - 45, 'jump');
                        boost.setScale(1.5);
                        boost.body.allowGravity = false;
                        boost.body.immovable = true;
        
                        platform.setData('boost', boost);
                    }
        
                    if (Phaser.Math.Between(1, 100) <= 6) {
                        const star = stars.create(platform.x, platform.y - 35, 'star');
                        star.body.allowGravity = false;
                        star.body.immovable = true;
        
                        platform.setData('star', star);
                    }
                }

                // Mettre à jour la dernière plateforme
                lastPlatformY = platform.y;
            } else if (lastPlatformY === null || platform.y < lastPlatformY) {
                lastPlatformY = platform.y;
            }
        });

        // Forcer la caméra à suivre le joueur
        this.cameras.main.centerOn(250, player.y);

        if (player.x < 0) {
            player.x = 500;
        } else if (player.x > 500) {
            player.x = 0;
        }

        if (player.body.touching.down && !player.isBoosting) {
            player.setVelocityY(-650);
        }

        // Mise à jour des contrôles dans update
        if (this.isLeftPressed || (cursors.left.isDown && !this.isRightPressed)) {
            player.setVelocityX(this.isControlsReversed ? normalSpeed : -normalSpeed);
            player.anims.play('left', true);
        } else if (this.isRightPressed || (cursors.right.isDown && !this.isLeftPressed)) {
            player.setVelocityX(this.isControlsReversed ? -normalSpeed : normalSpeed);
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn'); // Appelle la version correcte selon l'apparence
        }
           

        // Gestion du saut
        if (player.body.touching.down && !player.isBoosting) {
            player.setVelocityY(normalJump);
        }
        


        if (player.y < maxY) {
            maxY = player.y;
            const heightScore = Math.abs(Math.floor((700 - maxY) / 10));
            score = heightScore + bonusScore;
            scoreText.setText('Score: ' + score);
        }

        if (score >= 2000 && !this.isDifficultyIncreased) {
            this.isDifficultyIncreased = true; // Flag pour éviter une réaugmentation
            normalSpeed = 350; // Augmente la vitesse
            normalJump = -750; // Augmente la hauteur de saut
            this.physics.world.gravity.y = 800; // Augmente la gravité
    
            // Ajout d'un message visuel pour indiquer le changement
            const difficultyText = this.add.text(
                this.cameras.main.centerX,
                150,
                'Difficulté augmentée !',
                {
                    fontSize: `${this.scale.width / 20}px`,
                    fill: '#000',
                    align: 'center',
                }
            ).setOrigin(0.5).setScrollFactor(0);
    
            this.time.delayedCall(2000, () => {
                difficultyText.destroy(); // Supprime le message après 2 secondes
            });
        }

        if (score >= 3000 && this.isDifficultyIncreased && !this.isDifficultyIncreased2) {
            this.isDifficultyIncreased2 = true; // Flag pour éviter une réaugmentation
            normalSpeed = 520; // Augmente la vitesse
            normalJump = -950; // Augmente la hauteur de saut
            this.physics.world.gravity.y = 1000; // Augmente la gravité
    
            // Ajout d'un message visuel pour indiquer le changement
            const difficultyText2 = this.add.text(
                this.cameras.main.centerX,
                150,
                'Difficulté augmentée !',
                {
                    fontSize: `${this.scale.width / 20}px`,
                    fill: '#000',
                    align: 'center',
                }
            ).setOrigin(0.5).setScrollFactor(0);
    
            this.time.delayedCall(2000, () => {
                difficultyText2.destroy(); // Supprime le message après 2 secondes
            });
        }

        if (score >= 4000 && this.isDifficultyIncreased && this.isDifficultyIncreased2 && !this.isDifficultyIncreased3) {
            this.isDifficultyIncreased3 = true; // Flag pour éviter une réaugmentation
            normalSpeed = 720;
            normalJump = -1150;
            this.physics.world.gravity.y = 1200;

            // Ajout d'un message visuel pour indiquer le changement
            const difficultyText2 = this.add.text(
                this.cameras.main.centerX,
                150,
                'Difficulté augmentée !',
                {
                    fontSize: `${this.scale.width / 20}px`,
                    fill: '#000',
                    align: 'center',
                }
            ).setOrigin(0.5).setScrollFactor(0);
    
            this.time.delayedCall(2000, () => {
                difficultyText2.destroy(); // Supprime le message après 2 secondes
            });
        }

        if (this.currentAppearance === 'dude') {
            if (player.body.velocity.y > 50) { // Si le joueur tombe
                this.fallImage.setVisible(true);
                this.fallImage.setPosition(player.x, player.y); // Suivre la position du joueur
                player.setVisible(false); // Masquer le joueur
            } else {
                this.fallImage.setVisible(false);
                player.setVisible(true); // Rendre le joueur visible à nouveau
            }
        }

        if (this.currentAppearance === 'dude4') {
            if (player.body.velocity.y > 50) { // Si le joueur tombe
                this.fallImage4.setVisible(true);
                this.fallImage4.setPosition(player.x, player.y); // Suivre la position du joueur
                player.setVisible(false); // Masquer le joueur
            } else {
                this.fallImage4.setVisible(false);
                player.setVisible(true); // Rendre le joueur visible à nouveau
            }
        }

        if (this.currentAppearance === 'dude5') {
            if (player.body.velocity.y > 50) { // Si le joueur tombe
                this.fallImage5.setVisible(true);
                this.fallImage5.setPosition(player.x, player.y); // Suivre la position du joueur
                player.setVisible(false); // Masquer le joueur
            } else {
                this.fallImage5.setVisible(false);
                player.setVisible(true); // Rendre le joueur visible à nouveau
            }
        }

    }

    checkPlatform(player, platform) {
        if (platform.getData('isTrap')) {
            this.activateTrapEffect();
        } 
        if (platform.getData('isSpeed')) {
            this.activateSpeedEffect();
        }
    }

    activateTrapEffect() {
        const effectDuration = 5; // Durée en secondes
        let countdownTrap = effectDuration;

        // Si les commandes sont déjà inversées
        if (this.isControlsReversed) {
            // Réinitialise le décompte et le texte existant
            this.countdownEventTrap.remove(); // Supprime l'ancien événement
            this.trapText.setText(`Contrôles inversés ! : ${countdownTrap}`); // Remet le texte à jour
        } else {
            // Première activation des commandes inversées
            this.isControlsReversed = true;

            // Ajoute un texte centré en haut
            this.trapText = this.add.text(this.cameras.main.centerX, 100, `Contrôles inversés ! : ${countdownTrap}`, {
                fontSize: `${this.scale.width / 20}px`,
                fill: '#000',
                align: 'center',
                padding: { x: 10, y: 5 },
            }).setOrigin(0.5).setScrollFactor(0);
        }

        // Crée un événement pour le décompte
        this.countdownEventTrap = this.time.addEvent({
            delay: 1000, // Répète toutes les secondes
            callback: () => {
                countdownTrap--; // Diminue le décompte
                this.trapText.setText(`Contrôles inversés ! : ${countdownTrap}`); // Met à jour le texte

                // Si le décompte atteint 0, arrête l'effet
                if (countdownTrap <= 0) {
                    this.countdownEventTrap.remove(); // Supprime l'événement
                    this.trapText.destroy(); // Supprime le texte
                    this.isControlsReversed = false; // Réinitialise les commandes
                }
            },
            loop: true, // Répète l'événement
        });
    }

    activateSpeedEffect() {
        const effectDuration = 5; // Durée en secondes
        let countdown = effectDuration;

        // Si les commandes sont déjà inversées
        if (this.isSpeedBoosted) {
            // Réinitialise le décompte et le texte existant
            this.countdownEvent.remove(); // Supprime l'ancien événement
            this.speedText.setText(`Vitesse augmentée ! : ${countdown}`); // Remet le texte à jour
        } else {
            // Première activation des commandes inversées
            this.isSpeedBoosted = true;

            if (this.isDifficultyIncreased && !this.isDifficultyIncreased2 && !this.isDifficultyIncreased3) {
                normalSpeed = 520;
                normalJump = -950;
    
                this.physics.world.gravity.y = 1000;
            } else if (this.isDifficultyIncreased && this.isDifficultyIncreased2 && !this.isDifficultyIncreased3) {
                normalSpeed = 720;
                normalJump = -1150;
    
                this.physics.world.gravity.y = 1200;
            } else if(this.isDifficultyIncreased && this.isDifficultyIncreased2 && this.isDifficultyIncreased3) {
                normalSpeed = 920;
                normalJump = -1350;
    
                this.physics.world.gravity.y = 1400;
            } else {
                normalSpeed = 420;
                normalJump = -850;
    
                this.physics.world.gravity.y = 900;
            }

            // Ajoute un texte centré en haut
            this.speedText = this.add.text(this.cameras.main.centerX, 150, `Vitesse augmentée ! : ${countdown}`, {
                fontSize: `${this.scale.width / 20}px`,
                fill: '#000',
                align: 'center',
                padding: { x: 10, y: 5 },
            }).setOrigin(0.5).setScrollFactor(0);
        }

        // Crée un événement pour le décompte
        this.countdownEvent = this.time.addEvent({
            delay: 1000, // Répète toutes les secondes
            callback: () => {
                countdown--; // Diminue le décompte
                this.speedText.setText(`Vitesse augmentée ! : ${countdown}`); // Met à jour le texte

                // Si le décompte atteint 0, arrête l'effet
                if (countdown <= 0) {
                    this.countdownEvent.remove(); // Supprime l'événement
                    this.speedText.destroy(); // Supprime le texte
                    if (this.isDifficultyIncreased && !this.isDifficultyIncreased2 && !this.isDifficultyIncreased3) {
                        normalSpeed = 350;
                        normalJump = -750;
                        this.physics.world.gravity.y = 800;
                    } else if (this.isDifficultyIncreased && this.isDifficultyIncreased2 && !this.isDifficultyIncreased3) {
                        normalSpeed = 520;
                        normalJump = -950;
                        this.physics.world.gravity.y = 1000; 
                    } else if (this.isDifficultyIncreased && this.isDifficultyIncreased2 && this.isDifficultyIncreased3) {
                        normalSpeed = 720;
                        normalJump = -1150;
                        this.physics.world.gravity.y = 1200;
                    } else {
                        normalSpeed = 260;
                        normalJump = -650;
                        this.physics.world.gravity.y = normalGravity;
                    }
                    this.isSpeedBoosted = false; // Réinitialise les commandes
                }
            },
            loop: true, // Répète l'événement
        });
    }

    hitBoost(player, boost) {
        player.setVelocityY(-1300); // Augmenter la hauteur du saut
        boost.play('boost-hit');
        boost.on('animationcomplete', () => {
            boost.disableBody(true, true);
        });
        boost.disableBody(true, true);
        player.isBoosting = true; // Nouveau flag pour détecter le boost
        this.time.delayedCall(200, () => {
            player.isBoosting = false; // Réinitialiser après 200ms
        });
    }

    collectStar(player, star) {
        star.disableBody(true, true);
        bonusScore += 100; // Ajoute les points au score bonus
        score = Math.abs(Math.floor((700 - maxY) / 10)) + bonusScore; // Mets à jour le score global
        scoreText.setText('Score: ' + score);
    }


    updateHighScores(newScore) {
        // Récupérer les scores existants
        let highScores = JSON.parse(localStorage.getItem('highScores')) || [];

        // Ajouter le nouveau score et trier
        highScores.push(newScore);
        highScores.sort((a, b) => b - a);

        // Garder les 3 meilleurs scores
        highScores = highScores.slice(0, 3);

        // Sauvegarder dans localStorage
        localStorage.setItem('highScores', JSON.stringify(highScores));
    }

    getHighScores() {
        return JSON.parse(localStorage.getItem('highScores')) || [];
    }


    findBottomMostPlatform() {
        const platformList = platforms.getChildren(); // Récupère toutes les plateformes
        let bottomPlatform = platformList[0]; // Initialise avec la première plateforme

        for (let i = 1; i < platformList.length; i++) {
            const platform = platformList[i];
            if (platform.y > bottomPlatform.y) {
                bottomPlatform = platform;
            }
        }

        return bottomPlatform; // Retourne la plateforme la plus basse
    }

}

const Home = () => {
    const gameRef = useRef(null); // Référence locale pour le jeu

    // Fonction pour calculer la taille du jeu
    const calculateGameSize = () => {
        const maxWidth = 500;
        const maxHeight = 700;
        const width = Math.min(window.innerWidth, maxWidth);
        const height = Math.min(window.innerHeight, maxHeight);
        return { width, height };
    };

    useEffect(() => {
        // Calculez la taille initiale du jeu
        const { width, height } = calculateGameSize();

        // Configuration Phaser
        const config = {
            type: Phaser.AUTO,
            parent: 'phaser-container',
            width: width,
            height: height,
            scene: Example,
            physics: {
                default: 'arcade',
                arcade: {
                    gravity: { y: 600 },
                    debug: false,
                },
            },
        };

        // Initialiser le jeu Phaser
        gameRef.current = new Phaser.Game(config);

        // Gérer le redimensionnement
        const handleResize = () => {
            const { width, height } = calculateGameSize();
            if (gameRef.current) {
                gameRef.current.scale.resize(width, height);
            }
        };

        window.addEventListener('resize', handleResize);

        // Nettoyage lors du démontage du composant
        return () => {
            if (gameRef.current) {
                gameRef.current.destroy(true); // Détruit le jeu proprement
                gameRef.current = null;
            }
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <div id="phaser-container"></div>;
}

export default Home;
