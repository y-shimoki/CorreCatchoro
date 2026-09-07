"use strict"

const canvas = document.getElementById('canvas-do-jogo');
const ctx = canvas.getContext('2d');

// Aspect-ratio 16:10
canvas.width = 960;
canvas.height = 600;

// Ambos se referem ao player, o Catchoro
const SPRITE_WIDTH = 575;
const SPRITE_HEIGHT = 523;

const playerImage = new Image();
playerImage.src = "res/shadow_dog.png";

const BAT_SPRITE_HEIGHT = 44;
const BAT_SPRITE_WIDTH = 83;

const batImage = new Image();
batImage.src = 'res/enemy_bat_1.png';

// frameCounter é incrementado a cada frame. Ele é usado como base para as animações.
// staggerFrames é o número de frames pelo qual um sprite da animação deve permanecer antes de ir para o próximo.
// Ele serve para evitar que a animação seja realizada rápida demais.
let frameCounter = 0;
const staggerFrames = 5;

// Esta variável irá armazenar as informações de cada sprite de cada animação.
const animations = {};

// O spritesheet completo conta com animações adicionais. Apenas a walking, jumping e falling foram utilizadas.
Object.entries({
        idle: 7,
        jumping: 7,
        falling: 7,
        walking: 9,
        dizzy: 11,
        sitting: 5,
        rolling: 7,
        bite: 7,
        ko: 12,
        hit: 4,
}).forEach((pair, i) => {
        const animation = {};

        animation.sprites = [];
        for (let j = 0; j < pair[1]; ++j)
                animation.sprites.push({
                        x: j * SPRITE_WIDTH,
                        y: i * SPRITE_HEIGHT,
                });

        animations[pair[0]] = animation;        
});

// Esta variável irá armazenar os dados de animação do background.
const backgroundImages = [];

[
        '01_Mist.png',
        '02_Bushes.png',
        '03_Particles.png',
        '04_Forest.png',
        '05_Particles.png',
        '06_Forest.png',
        '07_Forest.png',
        '08_Forest.png',
        '09_Forest.png',
        '10_Sky.png',
].forEach((imageName, i) => {
        backgroundImages.push({});
        backgroundImages[i].image = new Image();
        backgroundImages[i].image.src = 'res/' + imageName;

        backgroundImages[i].loopPosition = 0;
        backgroundImages[i].loopSpeed = 6/(i+1);
});

const player = {
        x: 30,
        y: canvas.height - 185 - 30,
        currentAnimation: animations.walking,
        animationCounter: 0,
        verticalSpeed: 0,
        isOnTheGround: true,
        jumpCounter: 0,
};

// Variáveis utilizadas para evitar o delay de uma tecla pressionada continuamente.
let spaceIsPressed = false;
let dIsPressed = false;
let aIsPressed = false;

// Variáveis de controle do score.
let score = 0;
let highScore = 0;
let scoreTimeout = 0; // Conta o tempo que se passou desde a última vez que o score foi incrementado.

// Uma expressão idiomática para se fazer uma Enum em JavaScript.
const gameStates = Object.freeze({
        PLAYING:   Symbol("playing"),
        GAME_OVER: Symbol("game_over"),
});

let gameState = gameStates.PLAYING;

// Variáveis de controle dos inimigos.
let enemies = [];
const enemyInitialSpawnDelay = 5;
let enemySpawnDelay = 2;
let enemySpawnTimer = 0;

// Variável utilizada para impedir que os morcegos nasçam logo quando o jogo começa.
// É true somente durante 1 frame.
// Também é utilizada ao reiniciar o jogo.
let hasGameJustBegun = true;

const batSprites = [];

// Preenche batSprites.
for (let i = 0; i < 6; ++i)
{
        batSprites.push({ x: i * BAT_SPRITE_WIDTH, y: 0 });
}

ctx.fillStyle = "white";
ctx.strokeStyle = "black";
ctx.lineWidth = "0.5";

// Esse trecho inicial de código, logo abaixo, calcula o "delta" do jogo,
// que seria o tempo que levou para o frame anterior ser processado.
//
// O delta é utilizado para que a taxa de atualização do jogo (o framerate) não afete a velocidade
// na qual animações, física e a lógica do jogo no geral ocorrem.
let previousTime = Date.now();

function render() {
        // ============ Prólogo ============ //
        let currentTime = Date.now();
        let delta = (currentTime - previousTime)/1000; // Conversão para segundos
        previousTime = currentTime;

        // ============ Lógica do Jogo ============ //
        if (gameState === gameStates.PLAYING)
        {
                // Pula somente se o player estiver no chão.
                if (spaceIsPressed && player.isOnTheGround)
                {
                        player.isOnTheGround = false;
                        player.verticalSpeed = 980;
                        player.jumpCounter = 1;
                }
                // Realiza um pulo duplo somente se o player não está no chão e já pulou 1 vez.
                else if (spaceIsPressed && player.jumpCounter === 2)
                {
                        player.verticalSpeed =  980;
                        player.jumpCounter = 0; // Reseta o contador de pulos, impedindo que o player continue pulando.
                }

                // Move o jogador para a esquerda.
                if (aIsPressed)
                        player.x -= 500 * delta;

                // Move o jogador para a direita.
                if (dIsPressed)
                        player.x += 500 * delta;

                // Impede o jogador de sair da tela.
                if (player.x <= -10)
                {
                        player.x = -10;
                }
                else if (player.x >= canvas.width - 158)
                {
                        player.x = canvas.width - 158;
                }

                // Fica de olho para ver se o atributo isOnTheGround está atualizado.
                if (!player.isOnTheGround)
                {
                        // Se o player estiver realmente no ar...
                        if (player.y < canvas.height - 185 - 30) {
                                player.verticalSpeed -= 10;
                        }
                        // Se o player na verdade estiver no chão ...
                        else if (player.verticalSpeed < 0) {
                                player.verticalSpeed = 0; // Para o player.
                                player.isOnTheGround = true;
                        }
                }
                
                // Atualiza a posição vertical do player.
                player.y -= player.verticalSpeed * delta;

                // Impeede que o player saia da tela
                if (player.y >= canvas.height - 185 - 30)
                        player.y = canvas.height - 185 - 30;
                else if (player.y < -20)
                {
                        player.y = -20;
                        player.verticalSpeed = 0;
                }

                // Incrementa o timer do spawn de inimigos (morcegos).
                enemySpawnTimer += delta;

                // Configura o delay inicial para os inimigos nascerem.
                if (hasGameJustBegun)
                {
                        enemies = []; // No caso de reinício do jogo, limpa os inimigos.
                        enemySpawnDelay = enemyInitialSpawnDelay;
                        enemySpawnTimer = delta; // Limpa incrementos anteriores em caso de reinício do jogo.
                }

                // Se o tempo que passou for maior ou igual ao delay de spawn dos inimigos.
                if (enemySpawnTimer >= enemySpawnDelay)
                {
                        let y = Math.floor(Math.random() * 3);

                        // Spawna o inimigo próximo ao chão.
                        if (y === 0)
                        {
                                y = canvas.height - BAT_SPRITE_HEIGHT - 100;
                        }
                        // Spawna no meio da tela.
                        else if (y === 1)
                        {
                                y = (canvas.height - BAT_SPRITE_HEIGHT)/2
                        }
                        // Spawna o inimigo no alto da tela.
                        else
                        {
                                y = 10;
                        }

                        // Cria o inimigo ao adicioná-lo ao array enemies.
                        // A velocidade varia de 350 a 600 px/s entre inimigos.
                        enemies.push({ x: canvas.width, y: y, speed: Math.random() * 250 + 350, animationCounter: 0 });
                        enemySpawnTimer = 0; // Reseta o timer.
                        // Varia o delay de spawn entre inimigos: 0.3s a 3.8s após o inimigo anterior ter nascido.
                        enemySpawnDelay = Math.random() * (enemyInitialSpawnDelay - 3.5) + 0.3;
                }

                // Processa todos os inimigos.
                for (let i = 0; i < enemies.length; ++i)
                {
                        // Atualiza a posição horizontal do inimigo.
                        enemies[i].x -= enemies[i].speed * delta;

                        // Calcula o índice do sprite atual da animação do inimigo.
                        // O inimigo só possui 6 sprites, de forma que o índice deve permanecer entre 0 e 5.
                        enemies[i].animationCounter = Math.floor(frameCounter/staggerFrames) % 6;

                        // Calcula a colisão entre as hitboxes do player e do inimigo.
                        if ((player.x + 60 <= enemies[i].x + BAT_SPRITE_WIDTH && enemies[i].x + BAT_SPRITE_WIDTH <= player.x + 168 - 60
                                || player.x + 60 <= enemies[i].x && enemies[i].x <= player.x + 168 - 60)
                        && (player.y + 30 <= enemies[i].y + BAT_SPRITE_HEIGHT && enemies[i].y + BAT_SPRITE_HEIGHT <= player.y + 185 - 30
                                || player.y + 30 <= enemies[i].y && enemies[i].y <= player.y + 185 - 30))
                        {
                                gameState = gameStates.GAME_OVER; // Se o player colidiu com o inimigo, game over.
                        }

                        // Remove o inimigo do mundo caso ele tenha saído da tela.
                        if (enemies[i].x < -BAT_SPRITE_WIDTH)
                                enemies.splice(i, 1);
                }

                scoreTimeout += delta;
                // Só incrementa o score após 100ms.
                if (scoreTimeout >= 0.1)
                {
                        ++score;
                        scoreTimeout = 0;
                }

        }

        // ============ Renderização ============ //
        // Limpa a janela.
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // --- Background --- //
        // Renderiza a parte traseira do background com um efeito de parallax.
        // O background possui 10 camadas, 2 delas são frontais, ficando na frente do player,
        // as outras 8 são traseiras, ficando atrás do player.
        for (let i = backgroundImages.length - 1; i >= 2; --i)
        {
                ctx.drawImage(backgroundImages[i].image, backgroundImages[i].loopPosition, 0, canvas.width, backgroundImages[i].image.height, 0, 0, canvas.width, canvas.height);

                // Se o background ainda está na tela, mas não consegue preenchê-la,
                // renderiza novamente ao lado para criar um efeito de background infinito.
                if (backgroundImages[i].loopPosition + canvas.width > backgroundImages[i].image.width)
                        ctx.drawImage(backgroundImages[i].image, 0, 0, canvas.width, 1080, backgroundImages[i].image.width - backgroundImages[i].loopPosition, 0, canvas.width, canvas.height);

                // Se o background saiu por completo da tela, volta ao início.
                if (backgroundImages[i].loopPosition >= backgroundImages[i].image.width)
                        backgroundImages[i].loopPosition = 0;

                // Controla a velocidade do background.
                // Cada camada possui a sua velocidade, permitindo o efeito de parallax.
                backgroundImages[i].loopPosition += backgroundImages[i].loopSpeed;
        }

        // --- Foreground --- //
        // Altera a animação do player de acordo com seu estado atual.
        if (player.isOnTheGround)
                player.currentAnimation = animations.walking;
        else if (player.verticalSpeed >= 0)
                player.currentAnimation = animations.jumping;
        else if (player.verticalSpeed < 0)
                player.currentAnimation = animations.falling;

        // Calcula o índice do sprite atual da animação do player.
        // Mesma lógica do cálculo do índice da animação do inimigo.
        player.animationCounter = Math.floor(frameCounter/staggerFrames) % player.currentAnimation.sprites.length;

        // Renderiza o player.
        ctx.drawImage(playerImage, player.currentAnimation.sprites[player.animationCounter].x, player.currentAnimation.sprites[player.animationCounter].y, SPRITE_WIDTH, SPRITE_HEIGHT, player.x, player.y, 168, 185);

        // Renderiza os inimigos.
        for (let i = 0; i < enemies.length; ++i)
        {
                const enemy = enemies[i];
                ctx.drawImage(batImage, batSprites[enemy.animationCounter].x, 0, BAT_SPRITE_WIDTH, BAT_SPRITE_HEIGHT, enemy.x, enemy.y, BAT_SPRITE_WIDTH, BAT_SPRITE_HEIGHT);
        }

        // --- Background frontal --- //
        // Renderiza o resto das camadas do background, novamente com efeito de parallax.
        // Mesma lógica, mesmos cálculos.
        for (let i = 1; i >= 0; --i)
        {
                ctx.drawImage(backgroundImages[i].image, backgroundImages[i].loopPosition, 0, canvas.width, backgroundImages[i].image.height, 0, 0, canvas.width, canvas.height);

                if (backgroundImages[i].loopPosition + canvas.width > backgroundImages[i].image.width)
                        ctx.drawImage(backgroundImages[i].image, 0, 0, canvas.width, 1080, backgroundImages[i].image.width - backgroundImages[i].loopPosition, 0, canvas.width, canvas.height);

                if (backgroundImages[i].loopPosition >= backgroundImages[i].image.width)
                        backgroundImages[i].loopPosition = 0;

                backgroundImages[i].loopPosition += backgroundImages[i].loopSpeed;
        }

        if (gameState === gameStates.PLAYING)
        {
                // Renderiza a pontuação atual do jogador.
                let scoreText = "Pontuação: " + score;
                ctx.font = "bold 48px serif";
                ctx.fillText(scoreText, canvas.width - ctx.measureText(scoreText).width - 10, 48);
                ctx.strokeText(scoreText, canvas.width - ctx.measureText(scoreText).width - 10, 48);
        }
        else if (gameState === gameStates.GAME_OVER)
        {
                if (score > highScore)
                        highScore = score;

                // Renderiza o texto de game over.
                let text1 = "FIM DE JOGO";
                let text2 = "Sua pontuação: " + score;
                let text3 = "Maior pontuação: " + highScore;
                let text4 = "Aperte 'Enter' para recomeçar"

                ctx.font = "bold 80px serif";
                ctx.fillText(text1, (canvas.width - ctx.measureText(text1).width)/2, canvas.height/2 - 50);
                ctx.strokeText(text1, (canvas.width - ctx.measureText(text1).width)/2, canvas.height/2 - 50);

                ctx.font = "bold 48px serif";
                ctx.fillText(text2, (canvas.width - ctx.measureText(text2).width)/2, canvas.height/2 + 10);
                ctx.strokeText(text2, (canvas.width - ctx.measureText(text2).width)/2, canvas.height/2 + 10);

                ctx.fillText(text3, (canvas.width - ctx.measureText(text3).width)/2, canvas.height/2 + 80);
                ctx.strokeText(text3, (canvas.width - ctx.measureText(text3).width)/2, canvas.height/2 + 80);
        

                ctx.fillText(text4, (canvas.width - ctx.measureText(text4).width)/2, canvas.height/2 + 150);
                ctx.strokeText(text4, (canvas.width - ctx.measureText(text4).width)/2, canvas.height/2 + 150);
        }

        // ============ Epílogo ============ //
        ++frameCounter;
        hasGameJustBegun = false;
        requestAnimationFrame(render);
}

let gameHasStarted = false;

function startGame()
{
        // Evita que o usuário aperte o botão "Iniciar jogo" múltiplas vezes
        if (!gameHasStarted)
        {
                requestAnimationFrame(render);
                gameHasStarted = true;
        }
}

// ============ Entrada do Usuário ============
document.body.addEventListener('keydown', (event) => {
        if (event.key === 'a')
                aIsPressed = true;

        if (event.key === 'd')
                dIsPressed = true;

        if (event.key === ' ')
        {
                spaceIsPressed = true;

                // Devido à forma como o navegador interpreta a entrada do usuário,
                // este trecho foi necessário para permitir que o pulo duplo ocorresse sem problemas.
                if (player.jumpCounter === 1)
                        player.jumpCounter = 2;
        }
});

document.body.addEventListener('keyup', (event) => {
        if (event.key === 'a')
                aIsPressed = false;

        if (event.key === 'd')
                dIsPressed = false;

        if (event.key === ' ')
        {
                spaceIsPressed = false;
        }
});

document.body.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && gameState === gameStates.GAME_OVER)
        {
                hasGameJustBegun = true;

                gameState = gameStates.PLAYING; 
                score = 0;
        }
});