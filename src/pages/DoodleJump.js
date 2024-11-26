import React from 'react';
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

class Example extends Phaser.Scene {
    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.spritesheet('dude',
            'assets/player.png',
            { frameWidth: 42, frameHeight: 42 }
        );
        this.load.spritesheet('jump', 'assets/jump.png', {
            frameWidth: 48, // Largeur d'un frame
            frameHeight: 48, // Hauteur d'un frame
        });
    }

    create() {
        gameOver = false;

        // Arrière-plan ajusté pour la nouvelle taille
        this.add.image(250, 350, 'sky').setScrollFactor(0).setDisplaySize(500, 700); // Centré sur 500x700

        // Plateformes dynamiques
        platforms = this.physics.add.staticGroup();

        const ground = platforms.create(250, 690, 'ground'); // Centré en bas
        ground.setScale(1.5, 0.6); // Ajuste la largeur du sol
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
        player = this.physics.add.sprite(250, 600, 'dude').setScale(1.75); // Centré horizontalement

        boosts = this.physics.add.group();

        // Configuration du joueur
        player.setCollideWorldBounds(false);
        player.body.checkCollision.up = false;
        player.body.checkCollision.left = false;
        player.body.checkCollision.right = false;


        // Animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 4 }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 7 }],
            frameRate: 20,
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 7, end: 11 }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'boost',
            frames: this.anims.generateFrameNumbers('jump', { start: 0, end: 5 }),
            frameRate: 10,
            repeat: 0, // L'animation ne se répète pas
        });

        // Collision entre joueur et plateformes
        this.physics.add.collider(player, platforms);

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
            overlay.fillRect(0, 0, 500, 700); // Taille ajustée
            overlay.setScrollFactor(0);

            // Texte "GAME OVER"
            this.add
                .text(250, 200, 'GAME OVER', {
                    fontSize: '48px',
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
                .text(250, 300, scoreText, {
                    fontSize: '24px',
                    fill: '#fff',
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            // Bouton "Restart"
            const restartButton = this.add
                .text(250, 500, 'Restart', {
                    fontSize: '28px',
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
        
                // Ajouter un boost avec une probabilité de 10 %
                if (Phaser.Math.Between(1, 20) === 1) {
                    const boost = boosts.create(platform.x, platform.y - 45, 'jump');
                    boost.setScale(1.5);
                    boost.play('boost');
                    boost.body.allowGravity = false;
                    boost.body.immovable = true;
        
                    platform.setData('boost', boost);
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
            player.setVelocityX(-260);
            player.anims.play('left', true);
        } else if (cursors.right.isDown) {
            player.setVelocityX(260);
            player.anims.play('right', true);
        } else {
            player.setVelocityX(0);
            player.anims.play('turn');
        }

        if (player.y < maxY) {
            maxY = player.y;
            score = Math.abs(Math.floor((700 - maxY) / 10));
            scoreText.setText('Score: ' + score);
        }
    }


    hitBoost(player, boost) {
        player.setVelocityY(-1300); // Augmenter la hauteur du saut
        boost.disableBody(true, true);
        player.isBoosting = true; // Nouveau flag pour détecter le boost
        this.time.delayedCall(200, () => {
            player.isBoosting = false; // Réinitialiser après 200ms
        });
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
    const config = {
        type: Phaser.AUTO,
        parent: 'phaser-container',
        width: 500,
        height: 700,
        scene: Example,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 600 },
                debug: false
            }
        },
    };

    return (
        <div>
            <GameComponent config={config} />
        </div>
    );
}

export default Home;
