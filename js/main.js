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

    $('#condenseFormattedContentButton').on(
        'click',
        convertFormattedToRawButton
    );
    $('#copyFormattedContentButton').on(
        'click',
        copyFormattedButton
    );

    $('#jqtest').text("A toolset for ifMUD's JotaCode!");
});

function copyFrom(front, element) {
    navigator.clipboard.writeText(front + element.val());
}

function copyRawButton() {
    const dbref = $('#objectReference').val();
    const fieldName = $('#fieldName').val();
    copyFrom(
        '@field ' + '#' + dbref + '=' + fieldName + ':',
        rawMUDContentElement
    );
}

function copyFormattedButton() {
    const dbref = $('#objectReference').val();
    const fieldName = $('#fieldName').val();
    copyFrom(
        '#' + dbref + '.' + fieldName + '\n#\n',
        formattedMUDContentElement
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