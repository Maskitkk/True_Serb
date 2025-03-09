import * as THREE from 'three';

// Основные переменные
let camera, scene, renderer;
let player;
let collectibles = [];
let score = 0;
let mousePosition = new THREE.Vector3();
let gameStarted = false;
let resourcesLoaded = false;

// Создание загрузочного экрана
const loadingOverlay = document.createElement('div');
loadingOverlay.style.position = 'fixed';
loadingOverlay.style.top = '0';
loadingOverlay.style.left = '0';
loadingOverlay.style.width = '100%';
loadingOverlay.style.height = '100%';
loadingOverlay.style.backgroundColor = '#000000';
loadingOverlay.style.display = 'flex';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.zIndex = '2000';
loadingOverlay.style.flexDirection = 'column';

const loadingText = document.createElement('div');
loadingText.textContent = 'Загрузка...';
loadingText.style.color = 'white';
loadingText.style.fontSize = '24px';
loadingText.style.fontFamily = 'Arial';
loadingText.style.marginBottom = '20px';

const loadingProgress = document.createElement('div');
loadingProgress.style.width = '200px';
loadingProgress.style.height = '4px';
loadingProgress.style.backgroundColor = '#333';
loadingProgress.style.borderRadius = '2px';

const progressBar = document.createElement('div');
progressBar.style.width = '0%';
progressBar.style.height = '100%';
progressBar.style.backgroundColor = '#4CAF50';
progressBar.style.borderRadius = '2px';
progressBar.style.transition = 'width 0.3s';

loadingProgress.appendChild(progressBar);
loadingOverlay.appendChild(loadingText);
loadingOverlay.appendChild(loadingProgress);
document.body.appendChild(loadingOverlay);

// Создание начального экрана (скрыт изначально)
const startOverlay = document.createElement('div');
startOverlay.style.position = 'fixed';
startOverlay.style.top = '0';
startOverlay.style.left = '0';
startOverlay.style.width = '100%';
startOverlay.style.height = '100%';
startOverlay.style.backgroundColor = '#000000';
startOverlay.style.display = 'none';
startOverlay.style.justifyContent = 'center';
startOverlay.style.alignItems = 'center';
startOverlay.style.zIndex = '1000';
startOverlay.style.cursor = 'pointer';
startOverlay.style.flexDirection = 'column';

const gameTitle = document.createElement('div');
gameTitle.textContent = 'True_Serb';
gameTitle.style.color = 'white';
gameTitle.style.fontSize = '48px';
gameTitle.style.fontFamily = 'Arial';
gameTitle.style.marginBottom = '20px';
gameTitle.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';

const startText = document.createElement('div');
startText.textContent = 'Нажмите чтобы начать игру';
startText.style.color = 'white';
startText.style.fontSize = '24px';
startText.style.fontFamily = 'Arial';
startText.style.padding = '20px';
startText.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
startText.style.borderRadius = '10px';
startText.style.cursor = 'pointer';
startText.style.transition = 'background-color 0.3s';

startText.addEventListener('mouseover', () => {
    startText.style.backgroundColor = 'rgba(76, 175, 80, 0.5)';
});

startText.addEventListener('mouseout', () => {
    startText.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
});

startOverlay.appendChild(gameTitle);
startOverlay.appendChild(startText);
document.body.appendChild(startOverlay);

// Аудио
const backgroundMusic = new Audio('assets/background.mp3');
backgroundMusic.loop = true;
backgroundMusic.volume = 0.3;

const collectSound = new Audio('assets/collect.mp3');
collectSound.volume = 0.5;

// Загрузчик текстур
const textureLoader = new THREE.TextureLoader();
const loadManager = new THREE.LoadingManager();
let totalResources = 4; // фон, игрок, пиво, музыка
let loadedResources = 0;

// Загрузка шейдеров
const vertexShader = `
varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fragmentShader = `
uniform sampler2D tDiffuse;
uniform float blurAmount;
varying vec2 vUv;

void main() {
    vec4 color = vec4(0.0);
    float total = 0.0;
    
    // Размер шага для размытия
    vec2 texelSize = vec2(1.0 / 500.0);
    float radius = 2.0 * blurAmount;
    
    // Гауссово размытие
    for(float x = -radius; x <= radius; x += 1.0) {
        for(float y = -radius; y <= radius; y += 1.0) {
            vec2 offset = vec2(x, y) * texelSize;
            float weight = exp(-(x*x + y*y) / (2.0 * radius * radius));
            color += texture2D(tDiffuse, vUv + offset) * weight;
            total += weight;
        }
    }
    
    gl_FragColor = color / total;
}`;

loadManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    loadedResources++;
    const progress = (loadedResources / totalResources) * 100;
    progressBar.style.width = progress + '%';
};

loadManager.onLoad = function () {
    resourcesLoaded = true;
    loadingOverlay.style.display = 'none';
    startOverlay.style.display = 'flex';
};

// Предзагрузка текстур
const backgroundTexture = textureLoader.load('assets/fon.jpg', () => {
    loadedResources++;
    updateLoadingProgress();
});
const playerDefaultTexture = textureLoader.load('assets/vanya.png', () => {
    loadedResources++;
    updateLoadingProgress();
});
const beerTexture = textureLoader.load('assets/пиво1.png', () => {
    loadedResources++;
    updateLoadingProgress();
});

// Предзагрузка аудио
backgroundMusic.addEventListener('canplaythrough', () => {
    loadedResources++;
    updateLoadingProgress();
}, { once: true });

function updateLoadingProgress() {
    const progress = (loadedResources / totalResources) * 100;
    progressBar.style.width = progress + '%';
    if (loadedResources === totalResources && !resourcesLoaded) {
        resourcesLoaded = true;
        loadingOverlay.style.display = 'none';
        startOverlay.style.display = 'flex';
        init();
        animate();
    }
}

// Создание счетчика очков
const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '20px';
scoreElement.style.left = '20px';
scoreElement.style.color = 'white';
scoreElement.style.fontSize = '24px';
scoreElement.style.fontFamily = 'Arial';
scoreElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
document.body.appendChild(scoreElement);
updateScore(0);

// Функция обновления счета
function updateScore(newScore) {
    score = newScore;
    scoreElement.textContent = `Счёт: ${score}`;
}

// Создание коллекционного предмета (пиво)
function createCollectible() {
    // Удаляем все существующие предметы
    for (let collectible of collectibles) {
        scene.remove(collectible);
    }
    collectibles = [];

    const geometry = new THREE.PlaneGeometry(30, 30);
    const material = new THREE.MeshBasicMaterial({
        map: beerTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const collectible = new THREE.Mesh(geometry, material);

    // Случайная позиция на поле
    collectible.position.x = (Math.random() - 0.5) * 400;
    collectible.position.z = (Math.random() - 0.5) * 400;
    collectible.position.y = 2;
    collectible.rotation.x = -Math.PI / 2;

    scene.add(collectible);
    collectibles.push(collectible);
    return collectible;
}

// Проверка столкновений
function checkCollisions() {
    const playerRadius = 20;
    const collectibleRadius = 15;

    for (let i = collectibles.length - 1; i >= 0; i--) {
        const collectible = collectibles[i];
        const dx = player.position.x - collectible.position.x;
        const dz = player.position.z - collectible.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < playerRadius + collectibleRadius) {
            scene.remove(collectible);
            collectibles.splice(i, 1);
            updateScore(score + 1);
            collectSound.currentTime = 0;
            collectSound.play();
            createCollectible();
        }
    }
}

// Преобразование координат мыши в мировые координаты
function getMouseWorldPosition(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const targetPoint = new THREE.Vector3();

    if (raycaster.ray.intersectPlane(plane, targetPoint)) {
        return targetPoint;
    }
    return null;
}

// Создание фона
function createBackground() {
    // Создаем группу для фона
    const backgroundGroup = new THREE.Group();

    // Основное фоновое изображение с размытием
    const geometry = new THREE.PlaneGeometry(500, 500);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: backgroundTexture },
            blurAmount: { value: 1.0 } // Степень размытия
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
        transparent: true
    });
    const background = new THREE.Mesh(geometry, material);
    background.rotation.x = -Math.PI / 2;
    background.position.y = 0;

    // Затемняющий слой
    const darkOverlayGeometry = new THREE.PlaneGeometry(500, 500);
    const darkOverlayMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4, // Увеличили затемнение
        side: THREE.DoubleSide
    });
    const darkOverlay = new THREE.Mesh(darkOverlayGeometry, darkOverlayMaterial);
    darkOverlay.rotation.x = -Math.PI / 2;
    darkOverlay.position.y = 0.1;

    backgroundGroup.add(background);
    backgroundGroup.add(darkOverlay);
    return backgroundGroup;
}

// Создание игрока
function createPlayer() {
    const geometry = new THREE.PlaneGeometry(40, 40);
    const material = new THREE.MeshBasicMaterial({
        map: playerDefaultTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.rotation.x = -Math.PI / 2;
    playerMesh.position.y = 2;
    return playerMesh;
}

// Функция для начала игры
function startGame() {
    if (!gameStarted) {
        gameStarted = true;
        startOverlay.style.display = 'none';
        backgroundMusic.play();
        document.body.style.cursor = 'none';
    }
}

// Обработчик клика для запуска игры
startOverlay.addEventListener('click', startGame);

// Инициализация сцены
function init() {
    scene = new THREE.Scene();

    // Настройка камеры
    camera = new THREE.OrthographicCamera(
        -250, 250,
        250, -250,
        1, 1000
    );
    camera.position.set(0, 100, 0);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    // Создаем рендерер
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Добавляем фон
    scene.add(createBackground());

    // Создаем игрока
    player = createPlayer();
    scene.add(player);

    // Создаем первое пиво
    createCollectible();

    // Обработчики событий
    document.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onWindowResize);
}

// Обработка движения мыши
function onMouseMove(event) {
    const worldPosition = getMouseWorldPosition(event);
    if (worldPosition) {
        mousePosition.copy(worldPosition);
    }
}

// Обработка изменения размера окна
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 250;

    camera.left = -frustumSize * aspect;
    camera.right = frustumSize * aspect;
    camera.top = frustumSize;
    camera.bottom = -frustumSize;

    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Обновление позиции игрока
function updatePlayer() {
    if (!player || !mousePosition) return;

    // Плавное движение к позиции мыши
    player.position.x += (mousePosition.x - player.position.x) * 0.1;
    player.position.z += (mousePosition.z - player.position.z) * 0.1;
}

// Анимация
function animate() {
    requestAnimationFrame(animate);
    updatePlayer();
    checkCollisions();
    renderer.render(scene, camera);
} 