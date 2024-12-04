const cities = [
    {name: 'Москва', coords: [55.7558, 37.6173]},
    // { name: 'Санкт-Петербург', coords: [59.9343, 30.3351] },
    // { name: 'Екатеринбург', coords: [56.8389, 60.6057] },
    // { name: 'Новосибирск', coords: [55.0084, 82.9357] },
    // { name: 'Красноярск', coords: [56.0088, 92.8667] },
    // { name: 'Иркутск', coords: [52.2897, 104.2895] },
    // { name: 'Хабаровск', coords: [48.4802, 135.0722] },
    // { name: 'Владивосток', coords: [43.1155, 131.8854] },
    // { name: 'Казань', coords: [55.7961, 49.1064] },
    // { name: 'Ростов-на-Дону', coords: [47.2313, 39.7233] }
];

document.addEventListener('DOMContentLoaded', function () {
    ymaps.ready(initMap);
});

function initMap() {
    const panoramaContainer = document.getElementById('panorama');
    const loadRandomPanoramaButton = document.getElementById('loadRandomPanorama');
    let currentPanoramaCoords; // Храним текущие координаты панорамы
    let myPlacemark;

    function kmToDegrees(km) {
        return km / 111.32;
    }

    function getRandomCoordinates(lat, lon, radiusKm) {
        const radiusDeg = kmToDegrees(radiusKm);
        const u = Math.random();
        const v = Math.random();
        const w = radiusDeg * Math.sqrt(u);
        const t = 2 * Math.PI * v;
        const x = w * Math.cos(t);
        const y = w * Math.sin(t);
        const newLat = lat + x;
        const newLon = lon + y / Math.cos(lat * Math.PI / 180);
        return [newLat, newLon];
    }

    loadRandomPanoramaButton.addEventListener('click', function () {
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        if (!randomCity) {
            alert('Ты накодил какую-то хуйню!');
            return;
        }

        const randomCoords = getRandomCoordinates(randomCity.coords[0], randomCity.coords[1], 100);
        console.log(`Случайные координаты: ${randomCoords}`);
        tryRandomPanorama(randomCoords);
    });

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

    function getScore(distance) {
        if (distance < 1) return 5000;
        if (distance < 5) return 4000;
        if (distance < 20) return 3000;
        if (distance < 50) return 2000;
        if (distance < 100) return 1000;
        return 500;
    }

    function tryRandomPanorama(coords, attempt = 1) {
        const maxAttempts = 100;
        if (attempt > maxAttempts) {
            alert('Не удалось найти панораму после нескольких попыток.');
            return;
        }

        ymaps.panorama.locate(coords, {layer: 'yandex#panorama', maxCount: 1}).done(
            function (panoramas) {
                if (panoramas.length > 0) {
                    panoramaContainer.innerHTML = '';
                    const player = new ymaps.panorama.Player(panoramaContainer, panoramas[0], {
                        controls: [],
                        suppressMapOpenBlock: true
                    });

                    currentPanoramaCoords = panoramas[0].getPosition();
                    console.log('Начальные координаты панорамы:', currentPanoramaCoords);

                    player.events.add('directionchange', function () {
                        const currentPanorama = player.getPanorama();
                        if (currentPanorama) {
                            currentPanoramaCoords = currentPanorama.getPosition();
                            console.log('Обновление координат панорамы:', currentPanoramaCoords);
                        }
                    });
                } else {
                    const newCoords = getRandomCoordinates(coords[0], coords[1], 1);
                    tryRandomPanorama(newCoords, attempt + 1);
                }
            },
            function (error) {
                console.error('Ошибка загрузки панорамы:', error);
            }
        );
    }

    ymaps.ready(init);

    function init() {
        const myMap = new ymaps.Map('map', {
            center: [55.753994, 37.622093],
            zoom: 5
        }, {
            searchControlProvider: 'yandex#search'
        });

        myMap.events.add('click', function (e) {
            const coords = e.get('coords');
            if (myPlacemark) {
                myPlacemark.geometry.setCoordinates(coords);
            } else {
                myPlacemark = new ymaps.Placemark(coords, {}, {
                    preset: 'islands#violetDotIconWithCaption',
                    draggable: true
                });
                myMap.geoObjects.add(myPlacemark);
            }
            document.getElementById('coords').innerText = coords.join(', ');
        });
    }

    document.getElementById('submitGuess').addEventListener('click', function () {
        if (!myPlacemark) {
            alert('Вы ещё не поставили метку на карте!');
            return;
        }

        if (!currentPanoramaCoords) {
            alert('Координаты панорамы ещё не загружены.');
            return;
        }

        const userCoords = myPlacemark.geometry.getCoordinates();
        const distance = calculateDistance(
            userCoords[0], userCoords[1],
            currentPanoramaCoords[0], currentPanoramaCoords[1]
        );
        const score = getScore(distance);

        alert(`Расстояние: ${distance.toFixed(2)} км. Ваши баллы: ${score}`);
    });
}
