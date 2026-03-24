from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0007_eficacia_modelo_perguntas_tipos"),
    ]

    operations = [
        migrations.AlterField(
            model_name="eficaciaquestionario",
            name="treinamento",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="questionarios_eficacia",
                to="core.treinamento",
            ),
        ),
    ]
