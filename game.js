import * as THREE from 'three';

// Основные переменные
let camera, scene, renderer;
let player;
let collectibles = [];
let score = 0;
let mousePosition = new THREE.Vector3();
let gameStarted = false;
let resourcesLoaded = false;

// Добавляем определение мобильного устройства после основных переменных
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

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

// Объявляем переменные для ресурсов
let backgroundMusic, collectSound;
let backgroundTexture, playerDefaultTexture, beerTexture;

// Загрузчик текстур
const textureLoader = new THREE.TextureLoader();
const loadManager = new THREE.LoadingManager();

// Функция для отслеживания загрузки ресурсов
function updateLoadingProgress(current, total) {
    const progress = (current / total) * 100;
    console.log(`Загружено ${current} из ${total}: ${progress}%`);
    progressBar.style.width = progress + '%';
}

// Предзагрузка текстур с использованием Promise
function loadTexture(url) {
    return new Promise((resolve, reject) => {
        textureLoader.load(
            url,
            (texture) => {
                console.log('Текстура загружена:', url);
                resolve(texture);
            },
            (xhr) => {
                console.log(`${url}: ${(xhr.loaded / xhr.total * 100)}% загружено`);
            },
            (error) => {
                console.error('Ошибка загрузки текстуры:', url, error);
                reject(error);
            }
        );
    });
}

// Предзагрузка аудио с использованием Promise
function loadAudio(url, options = {}) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();

        audio.addEventListener('canplaythrough', () => {
            console.log('Аудио загружено:', url);
            if (options.loop) audio.loop = true;
            if (options.volume) audio.volume = options.volume;
            resolve(audio);
        }, { once: true });

        audio.addEventListener('error', (error) => {
            console.error('Ошибка загрузки аудио:', url, error);
            reject(error);
        });

        audio.src = url;
        audio.load();
    });
}

// Асинхронная загрузка всех ресурсов
async function loadResources() {
    let loaded = 0;
    const totalResources = 5; // 3 текстуры + 2 аудио

    try {
        loadingText.textContent = 'Загрузка текстур...';

        // Загружаем текстуры последовательно для лучшего отслеживания
        backgroundTexture = await loadTexture('assets/fon.jpg');
        updateLoadingProgress(++loaded, totalResources);

        playerDefaultTexture = await loadTexture('assets/vanya.png');
        updateLoadingProgress(++loaded, totalResources);

        beerTexture = await loadTexture('assets/пиво1.png');
        updateLoadingProgress(++loaded, totalResources);

        loadingText.textContent = 'Загрузка аудио...';

        // Загружаем аудио
        backgroundMusic = await loadAudio('assets/background.mp3', { loop: true, volume: 0.3 });
        updateLoadingProgress(++loaded, totalResources);

        collectSound = await loadAudio('assets/collect.mp3', { volume: 0.5 });
        updateLoadingProgress(++loaded, totalResources);

        console.log('Все ресурсы успешно загружены');
        loadingText.textContent = 'Загрузка завершена';

        // Инициализируем игру
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
            startOverlay.style.display = 'flex';
            init();
            animate();
        }, 500);

    } catch (error) {
        console.error('Ошибка загрузки ресурсов:', error);
        loadingText.textContent = 'Ошибка загрузки. Нажмите чтобы повторить.';
        loadingText.style.color = 'red';

        // Добавляем возможность повторной загрузки по клику
        loadingOverlay.onclick = () => {
            loadingText.textContent = 'Загрузка...';
            loadingText.style.color = 'white';
            progressBar.style.width = '0%';
            loadResources();
        };
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

// Добавляем мета-тег для правильного масштабирования на мобильных устройствах
const viewport = document.createElement('meta');
viewport.name = 'viewport';
viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
document.head.appendChild(viewport);

// Изменяем размеры и стили для мобильных устройств
if (isMobile) {
    gameTitle.style.fontSize = '36px';
    startText.style.fontSize = '20px';
    loadingText.style.fontSize = '20px';
    scoreElement.style.fontSize = '20px';
}

// Создание коллекционного предмета (пиво)
function createCollectible() {
    // Удаляем все существующие предметы
    for (let collectible of collectibles) {
        scene.remove(collectible);
    }
    collectibles = [];

    const geometry = new THREE.PlaneGeometry(45, 45); // Увеличиваем размер пива
    const material = new THREE.MeshBasicMaterial({
        map: beerTexture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const collectible = new THREE.Mesh(geometry, material);

    // Ограничиваем область появления предметов
    const frustumSize = isMobile ? 400 : 300;
    const aspect = window.innerWidth / window.innerHeight;
    const maxX = (frustumSize * aspect) * 0.7; // Уменьшаем до 70% от видимой области
    const maxZ = frustumSize * 0.7;

    collectible.position.x = (Math.random() - 0.5) * maxX * 2;
    collectible.position.z = (Math.random() - 0.5) * maxZ * 2;
    collectible.position.y = 2;
    collectible.rotation.x = -Math.PI / 2;

    scene.add(collectible);
    collectibles.push(collectible);
    return collectible;
}

// Проверка столкновений
function checkCollisions() {
    const playerRadius = 25; // Увеличиваем радиус коллизии игрока
    const collectibleRadius = 20; // Увеличиваем радиус коллизии пива

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

// Модифицируем функцию getMouseWorldPosition для поддержки тач-событий
function getMouseWorldPosition(event) {
    let clientX, clientY;

    if (event.touches) { // Для тач-событий
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else { // Для мыши
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

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
    const backgroundGroup = new THREE.Group();

    // Вычисляем размер фона с учетом соотношения сторон экрана
    const frustumSize = isMobile ? 400 : 300;
    const aspect = window.innerWidth / window.innerHeight;
    const width = frustumSize * aspect * 3; // Увеличиваем размер фона
    const height = frustumSize * 3;

    // Основное фоновое изображение
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            tDiffuse: { value: backgroundTexture },
            blurAmount: { value: 1.0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.DoubleSide,
        transparent: true
    });
    const background = new THREE.Mesh(geometry, material);
    background.rotation.x = -Math.PI / 2;
    background.position.y = 0;

    // Затемняющий слой с теми же размерами
    const darkOverlayGeometry = new THREE.PlaneGeometry(width, height);
    const darkOverlayMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.4,
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
    const geometry = new THREE.PlaneGeometry(50, 50); // Увеличиваем размер игрока
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
if (isMobile) {
    startOverlay.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startGame();
    }, { passive: false });
}

// Модифицируем функцию init для добавления обработчиков тач-событий
function init() {
    scene = new THREE.Scene();

    // Настройка камеры с учетом мобильных устройств
    const frustumSize = isMobile ? 400 : 300;
    const aspect = window.innerWidth / window.innerHeight;

    camera = new THREE.OrthographicCamera(
        -frustumSize * aspect,
        frustumSize * aspect,
        frustumSize,
        -frustumSize,
        1,
        1000
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

    // Обработчики событий с поддержкой тач-событий
    if (isMobile) {
        renderer.domElement.addEventListener('touchmove', onMouseMove, { passive: false });
        renderer.domElement.addEventListener('touchstart', onMouseMove, { passive: false });
    } else {
        renderer.domElement.addEventListener('mousemove', onMouseMove);
    }
    window.addEventListener('resize', onWindowResize);
}

// Предотвращаем скролл на мобильных устройствах
document.body.style.overflow = 'hidden';
document.body.style.position = 'fixed';
document.body.style.touchAction = 'none';

// Обновляем функцию onMouseMove для лучшей обработки тач-событий
function onMouseMove(event) {
    if (event.cancelable) {
        event.preventDefault();
    }

    // Проверяем, запущена ли игра
    if (!gameStarted) return;

    const worldPosition = getMouseWorldPosition(event);
    if (worldPosition) {
        mousePosition.copy(worldPosition);
    }
}

// Обработка изменения размера окна
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = isMobile ? 400 : 300; // Используем те же значения, что и в init

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

// Запускаем загрузку ресурсов
loadResources(); 