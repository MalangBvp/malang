const form = document.getElementById('accessForm') || document.getElementById('redirectorForm');
const passwordInput = document.getElementById('password');

const redirectorForm = document.getElementById('redirectorForm');
if (redirectorForm) {
    var encoded = 'Z2Vudmlp';
    var url = 'https://malangbvp.github.io/go/help';
    postfix = document.getElementById('postfix');
    //live update of url
    postfix.addEventListener('input', function () {
        document.getElementById('url').textContent = postfix.value;
    });
} else {
    var encoded = 'bWFsYW5ncGFyaw==';
    var url = 'treasury.html';
}

form.addEventListener('submit', function (e) {
    e.preventDefault();
    const input = passwordInput.value;

    const b64 = btoa(input);
    if (b64 === encoded) {
        window.location.href = url;
    } else {
        pwdElement=document.getElementById('password');
        pwdElement.value = '';
        pwdElement.focus();
        pwdElement.style.border= '1px solid rgb(250, 53, 53)';
        document.getElementById('error').style.opacity = 1;
        setTimeout(() => {
            pwdElement.style.border = '';
            document.getElementById('error').style.opacity = 0;
        }, 3000);
        navigator.vibrate(200);
    }
});
