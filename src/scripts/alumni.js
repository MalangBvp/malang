const container = document.getElementById("alumni");
const loader = document.getElementById("loader");

if (container) {
    if (loader) loader.style.display = "block";

    fetch("../../resrc/data/alumni.json")
        .then((res) => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.json();
        })
        .then((data) => {
            if (loader) loader.style.display = "none";

            data.forEach((genData) => {
                const wrapper = document.createElement("div");
                wrapper.className = "table-wrapper";

                const year = document.createElement("p");
                year.className = "vertical";
                year.textContent = genData.year;

                const gen = document.createElement("p");
                gen.className = "vertical";
                gen.textContent = genData.generation;

                const table = document.createElement("table");
                const imgRow = document.createElement("tr");
                const nameRow = document.createElement("tr");
                const roleRow = document.createElement("tr");

                genData.members.forEach((member) => {
                    const imgTd = document.createElement("td");
                    const img = document.createElement("img");
                    const imagePath = `../../resrc/images/members/${member.image}`;
                    fetch(imagePath, { method: "HEAD" })
                        .then((res) => {
                            if (res.ok) {
                                img.src = imagePath;
                            } else {
                                img.src = "../../resrc/images/members/person.webp";
                            }
                        });

                    img.alt = "";
                    img.className = "same";
                    img.style.cursor = "pointer";

                    // Open modal on image click
                    img.addEventListener("click", () => {
                        document.querySelector("section").classList.add("active");
                        document.getElementById("image-modal").style.display = "flex";
                        document.getElementById("modal-image").src = img.src;
                        document.getElementById("modal-title").textContent = `Name: ${member.name}`;
                        document.getElementById("modal-position").textContent = `Position: ${member.role}`;
                        //only last 4 digits of year
                        document.getElementById("modal-batch").textContent = `Batch: ${genData.year.slice(-4)}`;

                        const socials = document.getElementById("modal-socials");
                        socials.innerHTML = "";

                        if (member.instagram)
                            socials.innerHTML += `<a href="${member.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>`;
                        if (member.linkedin)
                            socials.innerHTML += `<a href="${member.linkedin}" target="_blank"><i class="fab fa-linkedin"></i></a>`;
                        if (member.email)
                            socials.innerHTML += `<a href="${member.email}" target="_blank"><i class="far fa-envelope"></i></a>`;
                        if (member.github)
                            socials.innerHTML += `<a href="${member.github}" target="_blank"><i class="fab fa-github"></i></a>`;
                        if (member.website)
                            socials.innerHTML += `<a href="${member.website}" target="_blank"><i class="fas fa-globe"></i></a>`;
                    });

                    imgTd.appendChild(img);
                    imgRow.appendChild(imgTd);

                    const nameTd = document.createElement("td");
                    nameTd.textContent = member.name;
                    nameTd.style.lineHeight = "15px";
                    nameRow.appendChild(nameTd);

                    const roleTd = document.createElement("td");
                    roleTd.style.fontSize = "12px";
                    roleTd.textContent = member.role;
                    roleRow.appendChild(roleTd);
                });

                table.appendChild(imgRow);
                table.appendChild(nameRow);
                table.appendChild(roleRow);

                wrapper.appendChild(year);
                wrapper.appendChild(gen);
                wrapper.appendChild(table);

                container.appendChild(wrapper);
            });
        })
        .catch((err) => {
            if (loader) loader.textContent = "Failed to load alumni data.";
            console.error("Alumni data load error:", err);
        });

    // Modal close
    document.querySelector(".modal-close")?.addEventListener("click", () => {
        document.querySelector("section").classList.remove("active");
        document.getElementById("image-modal").style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target.id === "image-modal") {
            document.getElementById("image-modal").style.display = "none";
        }
    });
}
