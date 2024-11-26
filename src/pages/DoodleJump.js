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

class Example extends Phaser.Scene {
    preload() {
        this.load.image('sky', 'assets/sky.png');
        this.load.image('ground', 'assets/platform.png');
        this.load.spritesheet('dude',
            'assets/dude.png',
            { frameWidth: 32, frameHeight: 48 }
        );
    }

    create() {
        gameOver = false;

        // Arrière-plan ajusté pour la nouvelle taille
        this.add.image(250, 350, 'sky').setScrollFactor(0).setDisplaySize(500, 700);; // Centré sur 500x700

        // Plateformes dynamiques
        platforms = this.physics.add.staticGroup();

        const ground = platforms.create(250, 690, 'ground'); // Centré en bas
        ground.setScale(1.5, 0.4); // Ajuste la largeur du sol
        ground.body.updateFromGameObject();

        // Générer les premières plateformes
        for (let i = 0; i < 4; i++) {
            const x = Phaser.Math.Between(50, 450); // Limité à la nouvelle largeur
            const y = 150 * i; // Espacement vertical ajusté pour 700px de hauteur

            const platform = platforms.create(x, y, 'ground');
            platform.setScale(0.25, 0.4); // Ajuste la taille des plateformes
            platform.body.updateFromGameObject();
        }

        // Joueur
        player = this.physics.add.sprite(250, 600, 'dude'); // Centré horizontalement

        // Configuration du joueur
        player.setCollideWorldBounds(false);
        player.body.checkCollision.up = false;
        player.body.checkCollision.left = false;
        player.body.checkCollision.right = false;


        // Animations
        this.anims.create({
            key: 'left',
            frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1,
        });

        this.anims.create({
            key: 'turn',
            frames: [{ key: 'dude', frame: 4 }],
            frameRate: 20,
        });

        this.anims.create({
            key: 'right',
            frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }),
            frameRate: 10,
            repeat: -1,
        });

        // Collision entre joueur et plateformes
        this.physics.add.collider(player, platforms);

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
                .text(250, 300, 'GAME OVER', {
                    fontSize: '48px',
                    fill: '#fff',
                })
                .setOrigin(0.5, 0.5)
                .setScrollFactor(0);

            // Bouton "Restart"
            const restartButton = this.add
                .text(250, 400, 'Restart', {
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

        // Déplacer et régénérer les plateformes
        platforms.children.iterate((child) => {
            const platform = child;
            const scrollY = this.cameras.main.scrollY;

            if (platform.y >= scrollY + 700) {
                platform.y = scrollY - Phaser.Math.Between(100, 200);
                platform.x = Phaser.Math.Between(50, 450);
                platform.setScale(0.25, 0.4).refreshBody();
            }
        });

        // Forcer la caméra à suivre le joueur
        this.cameras.main.centerOn(250, player.y);

        if (player.x < 0) {
            player.x = 500;
        } else if (player.x > 500) {
            player.x = 0;
        }

        if (player.body.touching.down) {
            player.setVelocityY(-600);
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
