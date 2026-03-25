document.addEventListener("DOMContentLoaded", () => {
    const flashes = document.querySelectorAll(".flash");
    flashes.forEach((flash, index) => {
        window.setTimeout(() => {
            flash.style.opacity = "0";
            flash.style.transform = "translateY(-4px)";
        }, 4500 + index * 400);
    });
});
