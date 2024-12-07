const CONSTANTS = {
    MAX_PANORAMA_ATTEMPTS: 300,
    RANDOM_RADIUS_KM: 1,
    SCORING_THRESHOLDS: [
        {distance: 1, score: 5000},
        {distance: 5, score: 4000},
        {distance: 20, score: 3000},
        {distance: 50, score: 2000},
        {distance: 100, score: 1000},
        {distance: Infinity, score: 500}
    ]
};

const cities = [
    {name: 'Москва', coords: [55.7558, 37.6173]},
    {name: 'Санкт-Петербург', coords: [59.9343, 30.3351]},
    {name: 'Новосибирск', coords: [55.0084, 82.9357]},
    {name: 'Екатеринбург', coords: [56.8389, 60.6057]},
    {name: 'Нижний Новгород', coords: [56.2965, 43.9362]},
    {name: 'Челябинск', coords: [55.1644, 61.4368]},
    {name: 'Самара', coords: [53.2001, 50.1525]},
    {name: 'Казань', coords: [55.7887, 49.1242]},
    {name: 'Ростов-на-Дону', coords: [47.2313, 39.7233]},
    {name: 'Красноярск', coords: [56.0153, 92.8932]}
];

document.addEventListener('DOMContentLoaded', function () {
    PopUpShow();
    ymaps.ready(initMap);
});

function initMap() {
    const panoramaContainer = document.getElementById('panorama');
    const loadRandomPanoramaButton = document.getElementById('loadRandomPanorama');
    const submitBtn = document.getElementById('submitGuess');
    const coordsDisplay = document.getElementById('coords');

    let currentPanoramaCoords;
    let myPlacemark;
    let myMap;
    let currentPanoramaPlayer;

    // Функция для автоматического проигрыша при взаимодействии с маркерами
    function handleMarkerPenalty(eventType) {
        // Прекращаем дальнейшее взаимодействие с панорамой
        if (currentPanoramaPlayer) {
            currentPanoramaPlayer.destroy();
        }

        // Формируем штрафные координаты - максимально удаленные от правильного ответа
        const penaltyCoords = [
            currentPanoramaCoords[0] + CONSTANTS.PENALTY_COORDINATES_OFFSET,
            currentPanoramaCoords[1] + CONSTANTS.PENALTY_COORDINATES_OFFSET
        ];

        // Показываем сообщение о нарушении правил
        let penaltyMessage = '';
        switch (eventType) {
            case 'markerexpand':
                penaltyMessage = 'Вы проиграли! Запрещено раскрывать маркеры.';
                break;
            case 'markercollapse':
                penaltyMessage = 'Вы проиграли! Запрещено взаимодействовать с маркерами.';
                break;
            default:
                penaltyMessage = 'Вы проиграли! Недопустимое взаимодействие с панорамой.';
        }

        // Визуализация штрафа
        alert(penaltyMessage);

        // Автоматическая установка метки на максимально удаленную точку
        if (myPlacemark) {
            myPlacemark.geometry.setCoordinates(penaltyCoords);
        } else {
            myPlacemark = new ymaps.Placemark(penaltyCoords, {
                hintContent: 'Штрафная метка',
                balloonContent: 'Метка установлена автоматически за нарушение правил'
            }, {
                iconLayout: 'default#image',
                iconImageHref: 'imgs/mark.png',
                iconImageOffset: [-17, -40]
            });
            myMap.geoObjects.add(myPlacemark);
        }

        // Принудительный вызов проверки ответа
        submitBtn.click();
    }

    // Улучшенное управление состоянием кнопок
    function updateButtonStates({
                                    randomPanoramaEnabled = false,
                                    submitEnabled = false
                                } = {}) {
        loadRandomPanoramaButton.disabled = !randomPanoramaEnabled;
        submitBtn.disabled = !submitEnabled;

        // Визуальное изменение состояния кнопок
        loadRandomPanoramaButton.classList.toggle('disabled', !randomPanoramaEnabled);
        submitBtn.classList.toggle('disabled', !submitEnabled);
    }


    function getRandomCoordinates(lat, lon, radiusKm) {
        // Используем более надежный метод генерации случайных координат
        const earthRadius = 6371; // радиус Земли в км

        // Равномерное распределение по азимуту
        const randomAzimuth = Math.random() * 2 * Math.PI;

        // Равномерное распределение по радиусу с квадратным корнем для компенсации
        const randomRadius = Math.sqrt(Math.random()) * radiusKm;

        // Преобразование сферических координат
        const dLat = randomRadius * Math.cos(randomAzimuth) / earthRadius * (180 / Math.PI);
        const dLon = randomRadius * Math.sin(randomAzimuth) / (earthRadius * Math.cos(lat * Math.PI / 180)) * (180 / Math.PI);

        const newLat = lat + dLat;
        const newLon = lon + dLon;

        return [newLat, newLon];
    }

    function getScore(distance) {
        for (let threshold of CONSTANTS.SCORING_THRESHOLDS) {
            if (distance < threshold.distance) {
                return threshold.score;
            }
        }
        return 500; // Минимальный балл по умолчанию
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    function tryRandomPanorama(coords, attempt = 1) {
        if (attempt > CONSTANTS.MAX_PANORAMA_ATTEMPTS) {
            alert('Не удалось найти панораму после нескольких попыток.');
            updateButtonStates({randomPanoramaEnabled: true});
            return;
        }

        ymaps.panorama.locate(coords, {layer: 'yandex#panorama', maxCount: 1}).done(
            function (panoramas) {
                if (panoramas.length > 0) {
                    updateButtonStates({randomPanoramaEnabled: false, submitEnabled: true});
                    panoramaContainer.innerHTML = '';
                    const currentPanoramaPlayer = new ymaps.panorama.Player(panoramaContainer, panoramas[0], {
                        controls: [],
                        suppressMapOpenBlock: true,
                    });

                    // Добавляем обработчики событий для маркеров
                    currentPanoramaPlayer.events.add([
                        'markerexpand',
                        'markercollapse'
                    ], function (event) {
                        const eventType = event.get('type');
                        handleMarkerPenalty(eventType);
                    });

                    currentPanoramaCoords = panoramas[0].getPosition();
                    console.log('Начальные координаты панорамы:', currentPanoramaCoords);

                    currentPanoramaPlayer.events.add('panoramachange', function () {
                        const currentPanorama = player.getPanorama();
                        if (currentPanorama) {
                            currentPanoramaCoords = currentPanorama.getPosition();
                            console.log('Обновление координат панорамы:', currentPanoramaCoords);
                        }
                    });
                } else {
                    const newCoords = getRandomCoordinates(coords[0], coords[1], CONSTANTS.RANDOM_RADIUS_KM);
                    //const newCoords = getRandomCoordinates(coords[0], coords[1], 1); //Для отладки, чтобы быстрее
                    // искалась панорама
                    tryRandomPanorama(newCoords, attempt + 1);
                }
            },
            function (error) {
                console.error('Ошибка загрузки панорамы:', error);
                updateButtonStates({randomPanoramaEnabled: true});
            }
        );
    }

    loadRandomPanoramaButton.addEventListener('click', function () {
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        if (!randomCity) {
            alert('Не удалось выбрать город. Пожалуйста, попробуйте еще раз.');
            return;
        }

        if (line) {
            myMap.geoObjects.remove(line);
        }

        const randomCoords = getRandomCoordinates(
            randomCity.coords[0],
            randomCity.coords[1],
            CONSTANTS.RANDOM_RADIUS_KM
        );
        console.log(`Случайные координаты: ${randomCoords}`);
        tryRandomPanorama(randomCoords);
    });

    function init() {
        myMap = new ymaps.Map('map', {
            center: [55.753994, 37.622093],
            zoom: 5
        }, {
            searchControlProvider: 'yandex#search'
        });

        myMap.events.add('click', function (e) {
            const coords = e.get('coords');
            if (submitBtn.disabled) return;

            if (myPlacemark) {
                myPlacemark.geometry.setCoordinates(coords);
            } else {
                myPlacemark = new ymaps.Placemark(coords, {
                    hintContent: 'Ваш ответ',
                    balloonContent: 'Вы указали это место как ответ'
                }, {
                    iconLayout: 'default#image',
                    iconImageHref: 'imgs/mark.png',
                    iconImageOffset: [-17, -40],
                    draggable: true
                });
                myMap.geoObjects.add(myPlacemark);
            }
        });
    }

// Переменные для подсчёта очков и текущего раунда
    let currentRound = 1;
    let totalScore = 0;
    const maxRounds = 5;
    let line;

// Обновление интерфейса очков и раунда
    function updateScoreBoard() {
        document.getElementById('currentRound').textContent = currentRound;
        document.getElementById('totalScore').textContent = totalScore;
    }

// Модификация кнопки подтверждения
    submitBtn.addEventListener('click', function () {
        if (!myPlacemark) {
            alert('Вы ещё не поставили метку на карте!');
            return;
        }

        if (!currentPanoramaCoords) {
            alert('Координаты панорамы ещё не загружены.');
            return;
        }

        const userCoords = myPlacemark.geometry.getCoordinates();
        const rightMark = new ymaps.Placemark(currentPanoramaCoords, {
            hintContent: 'Правильный ответ',
            balloonContent: 'Это место соответствует правильному ответу'
        }, {
            iconLayout: 'default#image',
            iconImageHref: 'imgs/mark2.png',
            iconImageOffset: [-16, -38]
        });
        myMap.geoObjects.add(rightMark);

        line = new ymaps.Polyline(
            [userCoords, currentPanoramaCoords],
            {},
            {
                strokeColor: '#1900ff',
                strokeWidth: 4,
                strokeOpacity: 0.8
            }
        );
        myMap.geoObjects.add(line);

        myPlacemark.options.set('draggable', false);

        const distance = calculateDistance(
            userCoords[0], userCoords[1],
            currentPanoramaCoords[0], currentPanoramaCoords[1]
        );
        const score = getScore(distance);

        alert(`Расстояние: ${distance.toFixed(2)} км. Ваши баллы: ${score}`);

        // Добавляем очки за текущий раунд
        totalScore += score;

        // Проверяем конец игры
        if (currentRound >= maxRounds) {
            alert(`Игра завершена! Ваш итоговый счёт: ${totalScore}`);
            updateButtonStates({randomPanoramaEnabled: false});
            return;
        }

        // Переход к следующему раунду
        currentRound++;
        updateScoreBoard();

        // Подготовка для следующего раунда
        updateButtonStates({randomPanoramaEnabled: true});
    });

// Инициализация доски очков
    document.addEventListener('DOMContentLoaded', updateScoreBoard);


    ymaps.ready(init);
    updateButtonStates({randomPanoramaEnabled: true});
}

//Функция отображения PopUp
function PopUpShow() {
    $("#popup1").fadeIn(500);
}

//Функция скрытия PopUp
function PopUpHide() {
    $("#popup1").fadeOut(500);
}
