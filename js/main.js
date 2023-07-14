var rawMUDContentElement;
var formattedMUDContentElement;

$(function () {
    rawMUDContentElement = $('#rawMUDContent');
    formattedMUDContentElement = $('#formattedMUDContent');

    $('#formatMUDContentButton').on(
        'click',
        convertRawToFormattedButton
    );
    $('#copyMUDContentButton').on(
        'click',
        copyRawButton
    );
    $('#copyMUDContentWithFieldButton').on(
        'click',
        copyRawWithFieldButton
    );

    $('#condenseFormattedContentButton').on(
        'click',
        convertFormattedToRawButton
    );
    $('#copyFormattedContentButton').on(
        'click',
        copyFormattedButton
    );

    document.documentElement.setAttribute('data-bs-theme', 'dark');

    $('#jqtest').text("A toolset for ifMUD's JotaCode!");
});

function copyFrom(front, element, replaceJoiner) {
    let content = front + element.val();
    if (replaceJoiner) content = processWithJoiner(content);
    navigator.clipboard.writeText(content);
}

const joinerRegEx = /;/g;

function processWithJoiner(str) {
    let joiner = $('#semicolonWrapper').val().trim();
    if (joiner.length === 0) joiner = ';';
    else if (!joiner.match(joinerRegEx)) joiner = ';';
    if (joiner === ';') return str;
    return str.replace(joinerRegEx, joiner);
}

function copyRawButton() {
    copyFrom(
        '', rawMUDContentElement, true
    );
}

function copyRawWithFieldButton() {
    const dbref = $('#objectReference').val();
    const fieldName = $('#fieldName').val();
    if (dbref.length === 0 || fieldName.length === 0) {
        copyRawButton();
        return;
    }
    copyFrom(
        '@field ' + '#' + dbref + '=' + fieldName + ':',
        rawMUDContentElement, true
    );
}

function copyFormattedButton() {
    const dbref = $('#objectReference').val();
    const fieldName = $('#fieldName').val();
    copyFrom(
        '#' + dbref + '.' + fieldName + '\n#\n',
        formattedMUDContentElement, false
    );
}

function convertRawToFormattedButton() {
    const srcString = rawMUDContentElement.val();
    var res = convertRawToFormatted(srcString);
    formattedMUDContentElement.val(res);
}

function convertFormattedToRawButton() {
    const srcString = formattedMUDContentElement.val();
    var res = convertFormattedToRaw(srcString);
    rawMUDContentElement.val(res);
}