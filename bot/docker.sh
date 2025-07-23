#!/bin/bash

# ======================================================== #
#               ИНСТРУКЦИЯ ПО ЗАПУСКУ СКРИПТА              #
#                                                          #
# 1. chmod +x docker.sh | Сделать файл испольняемым        #
# 2. ./docker.sh | Запустить файл                          #
# ======================================================== #

# Функция для центрирования Заголовков
print_centered_in_box() {
    local text="$1"
    local width=50
    local border
    border=$(printf '=%.0s' $(seq 1 $width))
    local text_length=${#text}
    local padding=$(( (width - text_length) / 2 ))
    local pad_left=$(printf ' %.0s' $(seq 1 $padding))

    local pad_right=""
    if (( (width - text_length) % 2 != 0 )); then
        pad_right=" "
    fi

    echo "$border"
    echo "${pad_left}${text}${pad_right}"
    echo "$border"
}

# Функция для Управлением образа
create_update_image() {
    echo ""
    print_centered_in_box "УПРАВЛЕНИЕ ОБРАЗАМИ"
    echo ""

    echo "Доступные образы на вашем устройстве:"
    docker images --format "  - {{.Repository}}:{{.Tag}}" | grep -vE '^- <none>:<none>'
    echo ""

    image_exists() {
        local name="$1"
        docker images --format "{{.Repository}}" | grep -wq "$name"
    }
    
    update_docker_image() {
        echo ""
        echo -e "- [BOT] | Запускаем обновление образа (\033[32m${image_name}:${image_tag}\033[0m)..."
        echo ""

        docker rmi -f ${image_name}:${image_tag} 2>/dev/null
        docker build --no-cache -t ${image_name}:${image_tag} .
    }

    create_docker_image() {
        echo ""
        echo -e "- [BOT] | Запускаем создание образа (\033[32m${image_name}:${image_tag}\033[0m)..."
        echo ""

        docker build -t ${image_name}:${image_tag} .
    }

    local image_name
    local image_tag

    echo 'Вы можете выбрать существующий образ, введя его имя, либо создать новый образ!'
    read -p "Введите название (Например: myapp): " image_name
    read -p "Введите тег (Например: latest): " image_tag

    image_count=$(docker images --format "  - {{.Repository}}:{{.Tag}}" | grep -vE '^- <none>:<none>' | wc -l)
        
    if [ "$image_count" -gt 0 ]; then
        for ((i=1; i<=image_count + 6; i++)); do
           echo -en "\033[1A\033[K"
        done
    fi

    if image_exists "$image_name"; then
        update_docker_image image_name image_tag
    else
        create_docker_image image_name image_tag
    fi
}

# Функция для Управление контейнерами
create_recreate_container() {
    echo ""
    print_centered_in_box "УПРАВЛЕНИЕ КОНТЕЙНЕРАМИ"
    echo ""

    echo "Доступные образы на вашем устройстве:"
    docker images --format "  - {{.Repository}}:{{.Tag}}" | grep -vE '^- <none>:<none>'
    echo ""

    echo "Доступные контейнеры на вашем устройстве:"
    docker ps -a --format "  - {{.Names}} ({{.Image}})" | grep -vE '^- <none>'
    echo ""

    local container_name
    local image_name
    local host_port
    local container_port

    read -p "Введите название контейнера (Например: myapp): " container_name
    read -p "Введите название образа (например: myapp:latest): " image_name
    read -p "Введите порт хоста (например: 8080 или 0): " host_port
    read -p "Введите порт контейнера (например: 80 или 0): " container_port

    image_count=$(docker images --format "  - {{.Repository}}:{{.Tag}}" | grep -vE '^- <none>:<none>' | wc -l)
    con_count=$(docker ps -a --format "  - {{.Names}} ({{.Image}})" | grep -vE '^- <none>' | wc -l)

    if [ $((con_count + image_count + 8)) -gt 0 ]; then
        for ((i=1; i<=(con_count + image_count + 8); i++)); do
           echo -en "\033[1A\033[K"
        done
    fi

    echo "- [Docker] | Название контейнера: ${container_name}"
    echo "- [Docker] | Название образа: ${image_name}"
    echo "- [Docker] | Порт хоста: ${host_port}"
    echo "- [Docker] | Порт контейнера: ${container_port}"

    # Проверяем, существует ли контейнер с таким именем
    if docker ps -a --format '{{.Names}}' | grep -wq "$container_name"; then
        echo ""
        echo "⚠️  Контейнер с именем \"$container_name\" уже существует."
        read -p "Хотите удалить существующий контейнер и создать новый? (y/n): " remove_choice
        
        if [[ "$remove_choice" =~ ^[Yy]$ ]]; then
            docker rm -f "$container_name"
            if [ $? -eq 0 ]; then
                echo "✅ Контейнер $container_name успешно удалён."
            else
                echo "❌ Не удалось удалить контейнер $container_name. Операция прервана."
                return 1
            fi
        else
            echo "Операция создания контейнера отменена пользователем."
            return 1
        fi
    fi

    # Создаём контейнер
    if [ "$host_port" != "0" ] && [ "$container_port" != "0" ]; then
        docker run -d --restart=always --name "$container_name" -p "$host_port":"$container_port" "$image_name"
    else
        docker run -d --restart=always --name "$container_name" "$image_name"
    fi

    if [ $? -eq 0 ]; then
        echo "✅ Контейнер $container_name успешно создан!"
    else
        echo "❌ Ошибка при создании контейнера"
    fi
}

# Функция для показа меню действий
show_action_menu() {
    echo ""

    print_centered_in_box "ВЫБОР ДЕЙСТВИЯ"

    echo ""
    echo "1. Управление образами"
    echo "2. Управление контейнерами"
    echo "0. Выход"
    echo ""
    read -p "Выберите действие (0-2): " choice
    
    case $choice in
        1)
            for i in {1..11}; do
                echo -en "\033[1A\033[K"
            done

            create_update_image
            ;;
        2)
            for i in {1..10}; do
                echo -en "\033[1A\033[K"
            done

            create_recreate_container
            ;;
        0)
            exit 0
            ;;
        *)
            echo "- [BOT] | Действие не обноружено, попробуйте еще раз!"
            show_action_menu
            ;;
    esac
}

# Функция для проверки наличия Docker
check_docker() {
    loading_animation() {
        local message="$1"
        local dots=""
        local count=0
    
        while [ $count -lt 3 ]; do
            echo -ne "\r- [BOT] | $message$dots"
            sleep 0.5
            dots="$dots."
            count=$((count + 1))
        done

        echo -ne "\r- [BOT] | $message..."
        sleep 0.5
    }

    loading_animation "Проверка наличие Docker"

    show_docker_download_link() {
        echo ""
        echo -e "\033[31m🌐 Скачать Docker можно с официального сайта:\033[0m"
        echo -e "\033[31m   https://www.docker.com/products/docker-desktop/\033[0m"
        echo ""
    }
    
    if command -v docker &> /dev/null; then
        docker_version=$(docker --version | cut -d' ' -f3 | tr -d ',')
        
        echo -e "\r- [BOT] | Docker версии: \033[32m$docker_version\033[0m установлен на вашем пк!"
        return 0
    else
        echo -e "\r- [BOT] | Docker не установлен на вашем пк!"
        show_docker_download_link
        return 1
    fi
}

# Основная функция
main() {
    clear

    print_docker_logo() {
        echo ""
        echo '    ____                   __                '
        echo '   / __ \  ____   _____   / /__  ___    _____'
        echo '  / / / / / __ \ / ___/  / //_/ / _ \  / ___/'
        echo ' / /_/ / / /_/ // /__   /  <   /  __/ / /    '
        echo '/_____/  \____/ \___/  /_/|_|  \___/ /_/     '
        echo ""
    }

    print_docker_logo
    print_centered_in_box "ДОБРО ПОЖАЛОВАТЬ В DOCKER!"

    echo ""
    
    check_docker
    
    if [ $? -eq 0 ]; then
        show_action_menu
    else
        echo -e "- [BOT] | \033[31mУстановите Docker и запустите скрипт снова!\033[0m"
    fi
}

main