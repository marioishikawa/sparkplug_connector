//TODO: Check which page user is on and only send socket data to appropriate page.

const socket = io();

socket.on('welcomeMessage', message => {
    console.log(message);
});

socket.on('connection', status => {
    let connectionIcon = document.querySelector('.connection-icon');
    
    if(status.connecting){
        connectionIcon.src = "/assets/lan-pending.svg";
    } else if (!status.connecting && status.connected) {
        connectionIcon.src = "/assets/lan-connect.svg";
    } else {
        connectionIcon.src = "/assets/lan-disconnect.svg";
    }
});

socket.on('data', dataValues => {
    let dataTableBody = document.getElementById('data-table-body');

    async function deleteTable(){
        dataTableBody.innerHTML = "";
    }
    
    async function createTable(){
        await deleteTable();

        dataValues.metrics.forEach((metric) => {
            let row = dataTableBody.insertRow();
            let cell_0 = row.insertCell(0);
            cell_0.innerHTML= metric.name;
            let cell_1 = row.insertCell(1);
            cell_1.innerHTML = metric.value;
            let cell_2 = row.insertCell(2);
            cell_2.innerHTML = metric.type;
        });
    }

    deleteTable();
    createTable();
});