import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import GameComponent from '../components/GameComponent';

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

class Example extends Phaser.Scene {
    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.image('ground_trap', 'assets/platform_trap.png');
        this.load.spritesheet('dude',
            'assets/player.png',
            { frameWidth: 32, frameHeight: 32 }
        );
        this.load.spritesheet('jump', 'assets/jump.png', {
            frameWidth: 48, // Largeur d'un frame
            frameHeight: 48, // Hauteur d'un frame
        });
        this.load.image('star', 'assets/star.png');
        this.load.image('fall', 'assets/fall.png');
        this.load.image('arrow', 'assets/arrow.png');
    }

    create() {
        gameOver = false;

        this.isControlsReversed = false;

        // Arrière-plan ajusté pour la nouvelle taille
        this.add.image(this.scale.width / 2, this.scale.height / 2, 'sky')
            .setScrollFactor(0)
            .setDisplaySize(this.scale.width, this.scale.height); // Centré sur 500x700

        // Plateformes dynamiques
        platforms = this.physics.add.staticGroup();

        const ground = platforms.create(this.scale.width / 2, this.scale.height - 10, 'ground');
        ground.setScale(1.5, 0.6); // Ajuster la taille visuellement
        ground.body.updateFromGameObject();

        let lastPlatformY = 600;

        // Générer les premières plateformes
        for (let i = 0; i < 4; i++) {
            const x = Phaser.Math.Between(100, 400); // Limité à la nouvelle largeur
            const y = lastPlatformY - Phaser.Math.Between(120, 200);// Espacement vertical ajusté pour 700px de hauteur

            const platform = platforms.create(x, y, 'ground');
            platform.setScale(0.25, 0.6).refreshBody(); // Ajuste la taille des plateformes
            platform.body.updateFromGameObject();

            lastPlatformY = y;
        }

        // Joueur
        player = this.physics.add.sprite(this.scale.width / 2, this.scale.height - 100, 'dude').setScale(1.75); // Centré horizontalement

        this.fallImage = this.add.image(250, 600, 'fall').setScale(1.75);;
        this.fallImage.setVisible(false);

        boosts = this.physics.add.group();

        stars = this.physics.add.group();

        this.physics.add.overlap(player, stars, this.collectStar, null, this);

        // Configuration du joueur
        player.setCollideWorldBounds(false);
        player.body.checkCollision.up = false;
        player.body.checkCollision.left = false;
        player.body.checkCollision.right = false;


        // Animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 11 }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 15 }],
            frameRate: 20,
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 12, end: 23 }),
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
        this.isJumpPressed = false;

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
            player.setTint(0xff0000);
            player.anims.stop();

            // Overlay semi-transparent
            const overlay = this.add.graphics();
            overlay.fillStyle(0x000000, 0.5);
            overlay.fillRect(0, 0, this.scale.width, this.scale.height);
            overlay.setScrollFactor(0);

            // Texte "GAME OVER"
            this.add
                .text(this.scale.width / 2, this.scale.height / 2 - 100, 'GAME OVER', {
                    fontSize: `${this.scale.width / 10}px`, // Taille de police adaptative
                    fill: '#fff',
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            // Mettre à jour les meilleurs scores
            this.updateHighScores(score);

            // Afficher les meilleurs scores
            const highScores = this.getHighScores();
            let scoreText = 'Top Scores:\n';
            highScores.forEach((highScore, index) => {
                scoreText += `${index + 1}. ${highScore}\n`;
            });

            this.add
                .text(this.scale.width / 2, this.scale.height / 2, scoreText, {
                    fontSize: `${this.scale.width / 20}px`, // Taille de police adaptative
                    fill: '#fff',
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            // Bouton "Restart"
            const restartButton = this.add
                .text(this.scale.width / 2, this.scale.height / 2 + 150, 'Restart', {
                    fontSize: `${this.scale.width / 15}px`, // Taille de police adaptative
                    fill: '#fff',
                    backgroundColor: '#000',
                    padding: { x: 10, y: 5 },
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            restartButton.setInteractive({ useHandCursor: true });
            restartButton.on('pointerover', () => {
                restartButton.setStyle({ fill: 'red' });
            });
            restartButton.on('pointerout', () => {
                restartButton.setStyle({ fill: '#fff' });
            });
            restartButton.on('pointerdown', () => {
                this.scene.restart();
                score = 0;
                gameOver = false;
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
                platform.setScale(0.25, 0.6).refreshBody();

                // Supprimer le boost s'il existe
                if (platform.getData('boost')) {
                    platform.getData('boost').destroy();
                    platform.setData('boost', null);
                }

                if (platform.getData('star')) {
                    platform.getData('star').destroy();
                    platform.setData('star', null);
                }

                // Ajouter un boost avec une probabilité de 5 %
                if (Phaser.Math.Between(1, 100) <= 2) {
                    const boost = boosts.create(platform.x, platform.y - 45, 'jump');
                    boost.setScale(1.5);
                    boost.body.allowGravity = false;
                    boost.body.immovable = true;

                    platform.setData('boost', boost);
                }

                if (Phaser.Math.Between(1, 100) <= 2) {
                    const star = stars.create(platform.x, platform.y - 35, 'star');
                    star.body.allowGravity = false;
                    star.body.immovable = true;

                    platform.setData('star', star);
                }

                if (Phaser.Math.Between(1, 100) <= 20) {
                    platform.setTexture('ground_trap');
                    platform.setData('isTrap', true);
                } else {
                    platform.setTexture('ground');
                    platform.setData('isTrap', false);
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

        if (cursors.left.isDown) {
            player.setVelocityX(this.isControlsReversed ? 260 : -260); // Commandes inversées
            player.anims.play('left', true);
        } else if (cursors.right.isDown) {
            player.setVelocityX(this.isControlsReversed ? -260 : 260); // Commandes inversées
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        if (this.isLeftPressed) {
            player.setVelocityX(this.isControlsReversed ? 260 : -260);
            player.anims.play('left', true);
        } else if (this.isRightPressed) {
            player.setVelocityX(this.isControlsReversed ? -260 : 260);
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        if (player.y < maxY) {
            maxY = player.y;
            const heightScore = Math.abs(Math.floor((700 - maxY) / 10));
            score = heightScore + bonusScore;
            scoreText.setText('Score: ' + score);
        }

        if (player.body.velocity.y > 50) { // Le joueur tombe
            this.fallImage.setVisible(true);
            this.fallImage.setPosition(player.x, player.y); // Suit la position du joueur
            player.setVisible(false); // Cache le joueur si nécessaire
        } else {
            this.fallImage.setVisible(false);
            player.setVisible(true); // Affiche le joueur normalement
        }

    }

    checkPlatform(player, platform) {
        if (platform.getData('isTrap')) {
            console.log('Trap activated!'); // Vérifie que ce message s’affiche dans la console
            this.activateTrapEffect();
        }
    }

    activateTrapEffect() {
        const effectDuration = 5; // Durée en secondes
        let countdown = effectDuration;

        // Si les commandes sont déjà inversées
        if (this.isControlsReversed) {
            // Réinitialise le décompte et le texte existant
            this.countdownEvent.remove(); // Supprime l'ancien événement
            this.trapText.setText(`Contrôles inversés ! : ${countdown}`); // Remet le texte à jour
        } else {
            // Première activation des commandes inversées
            this.isControlsReversed = true;

            // Ajoute un texte centré en haut
            this.trapText = this.add.text(this.cameras.main.centerX, 100, `Contrôles inversés ! : ${countdown}`, {
                fontSize: '26px',
                fill: '#ff0000',
                align: 'center',
                padding: { x: 10, y: 5 },
            }).setOrigin(0.5).setScrollFactor(0);
        }

        // Crée un événement pour le décompte
        this.countdownEvent = this.time.addEvent({
            delay: 1000, // Répète toutes les secondes
            callback: () => {
                countdown--; // Diminue le décompte
                this.trapText.setText(`Contrôles inversés ! : ${countdown}`); // Met à jour le texte

                // Si le décompte atteint 0, arrête l'effet
                if (countdown <= 0) {
                    this.countdownEvent.remove(); // Supprime l'événement
                    this.trapText.destroy(); // Supprime le texte
                    this.isControlsReversed = false; // Réinitialise les commandes
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
