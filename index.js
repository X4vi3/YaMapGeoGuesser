document.addEventListener('DOMContentLoaded', function () {
    ymaps.ready(initMap);
});

function initMap() {
    const panoramaContainer = document.getElementById('panorama');
    const coordinateInput = document.getElementById('coordinateInput');
    const loadPanoramaButton = document.getElementById('loadPanorama');

    loadPanoramaButton.addEventListener('click', function () {
        const coordinates = coordinateInput.value.split(',').map(coord => parseFloat(coord.trim()));

        if (coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1])) {
            loadPanorama(coordinates);
        } else {
            alert('Введите корректные координаты');
        }
    });

    function loadPanorama(coords) {
        panoramaContainer.innerHTML = '';

        ymaps.panorama.locate(coords, {
            layer: 'yandex#panorama',
            // Расширенные опции поиска панорамы
            maxCount: 1,
            direction: [0, 0]
        }).done(
            function (panoramas) {
                if (panoramas.length > 0) {
                    const player = new ymaps.panorama.Player(
                        panoramaContainer,
                        panoramas[0],
                        {
                            controls: ['zoomControl', 'fullscreenControl', 'typeControl'],
                            suppressMapOpenBlock: true
                        }
                    );
                } else {
                    // Детальная диагностика отсутствия панорамы
                    ymaps.geocode(coords, {kind: 'locality'}).then(function (result) {
                        const geoObject = result.geoObjects.get(0);
                        const address = geoObject ? geoObject.getAddressLine() : 'Неизвестное место';
                        alert(`Панорама не найдена для координат ${coords}. Ближайший адрес: ${address}`);
                    });
                }
            },
            function (error) {
                console.error('Ошибка при загрузке панорамы:', error);
                alert('Не удалось загрузить панораму. Проверьте координаты и подключение.');
            }
        );
    }
}